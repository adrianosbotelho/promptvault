"""
Background Agent Worker.

Runs periodically to analyze latest prompts using AgentService.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.agent.agent_service import AgentService
from app.services.prompt_service import PromptService
from app.core.config import settings

logger = logging.getLogger(__name__)

# Worker configuration
ANALYSIS_INTERVAL_MINUTES = 5
MAX_PROMPTS_TO_ANALYZE = 5  # Analyze top 5 latest prompts
WORKER_ENABLED = True  # Set to False to disable the worker
MAX_RETRIES_PER_PROMPT = 2  # Maximum retries per prompt before skipping
USE_FREE_APIS_ONLY = True  # If True, worker will only use free APIs (Groq, HuggingFace, Mock)


class AgentWorker:
    """Background worker that periodically analyzes prompts."""
    
    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the background worker."""
        if not WORKER_ENABLED:
            logger.info("Agent worker is disabled. Set WORKER_ENABLED=True to enable.")
            return
        
        if self.running:
            logger.warning("Agent worker is already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self._run_loop())
        logger.info(f"Agent worker started. Will analyze prompts every {ANALYSIS_INTERVAL_MINUTES} minutes.")
    
    async def stop(self):
        """Stop the background worker."""
        if not self.running:
            return
        
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Agent worker stopped.")
    
    async def _run_loop(self):
        """Main worker loop."""
        while self.running:
            try:
                await self._analyze_latest_prompts()
            except Exception as e:
                logger.error(f"Error in agent worker loop: {e}", exc_info=True)
            
            # Wait for the interval before next run
            if self.running:
                await asyncio.sleep(ANALYSIS_INTERVAL_MINUTES * 60)
    
    async def _analyze_latest_prompts(self):
        """Analyze the latest prompts."""
        db: Session = SessionLocal()
        
        try:
            # Get latest prompts
            prompt_list = PromptService.list_prompts(db)
            
            if not prompt_list:
                logger.debug("No prompts found to analyze")
                return
            
            # Sort by updated_at descending and take top N
            sorted_prompts = sorted(
                prompt_list,
                key=lambda p: p.updated_at,
                reverse=True
            )[:MAX_PROMPTS_TO_ANALYZE]
            
            logger.info(f"Analyzing {len(sorted_prompts)} latest prompts...")
            
            # Initialize agent service with free API provider if configured
            from app.core.llm_provider import LLMProvider
            from app.providers.groq_provider import GroqProvider
            from app.providers.huggingface_provider import HuggingFaceProvider
            from app.providers.mock_provider import MockLLMProvider
            
            llm_provider: Optional[LLMProvider] = None
            
            if USE_FREE_APIS_ONLY:
                # Try to use free APIs only
                if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                    try:
                        llm_provider = GroqProvider()
                        logger.info("Worker using Groq (free tier) for analysis")
                    except Exception as e:
                        logger.warning(f"Failed to initialize GroqProvider: {e}")
                
                if not llm_provider:
                    # Try Hugging Face
                    if hasattr(settings, 'HUGGINGFACE_API_KEY') and settings.HUGGINGFACE_API_KEY:
                        try:
                            llm_provider = HuggingFaceProvider()
                            logger.info("Worker using HuggingFace (free tier) for analysis")
                        except Exception as e:
                            logger.warning(f"Failed to initialize HuggingFaceProvider: {e}")
                
                if not llm_provider:
                    # Fallback to Mock
                    llm_provider = MockLLMProvider()
                    logger.info("Worker using MockLLMProvider (no API costs)")
            
            agent_service = AgentService(db, llm_provider=llm_provider)
            
            analyzed_count = 0
            error_count = 0
            skipped_count = 0
            
            for prompt_item in sorted_prompts:
                retry_count = 0
                success = False
                
                while retry_count <= MAX_RETRIES_PER_PROMPT and not success:
                    try:
                        if retry_count > 0:
                            # Exponential backoff: wait 2^retry_count seconds
                            wait_time = 2 ** retry_count
                            logger.debug(f"Retrying prompt {prompt_item.id} after {wait_time}s (attempt {retry_count + 1}/{MAX_RETRIES_PER_PROMPT + 1})")
                            await asyncio.sleep(wait_time)
                        
                        logger.debug(f"Analyzing prompt ID {prompt_item.id}: {prompt_item.name}")
                        
                        # Get suggestions for this prompt
                        suggestions = await agent_service.get_suggestions(
                            prompt_id=prompt_item.id,
                            user_query=(
                                "Analyze this prompt and provide suggestions for improvements, "
                                "reusable patterns that could be applied, and any warnings about "
                                "potential issues or missing instructions."
                            ),
                            similar_count=3,  # Use fewer similar prompts for background analysis
                            latest_count=5    # Use fewer latest prompts for background analysis
                        )
                        
                        # Log summary of suggestions
                        improvements = len(suggestions.improvement_ideas)
                        patterns = len(suggestions.reusable_patterns)
                        warnings = len(suggestions.warnings)
                        
                        if improvements > 0 or patterns > 0 or warnings > 0:
                            logger.info(
                                f"Prompt {prompt_item.id} analyzed: "
                                f"{improvements} improvements, {patterns} patterns, {warnings} warnings"
                            )
                        else:
                            logger.debug(f"Prompt {prompt_item.id} analyzed: No suggestions found")
                        
                        analyzed_count += 1
                        success = True
                        
                        # Small delay between analyses to avoid rate limits
                        await asyncio.sleep(2)  # Increased delay for free APIs
                        
                    except Exception as e:
                        retry_count += 1
                        error_msg = str(e)
                        
                        # Check if it's a rate limit error
                        is_rate_limit = "429" in error_msg or "rate limit" in error_msg.lower()
                        
                        if is_rate_limit and retry_count <= MAX_RETRIES_PER_PROMPT:
                            logger.warning(
                                f"Rate limit encountered for prompt {prompt_item.id}. "
                                f"Will retry (attempt {retry_count}/{MAX_RETRIES_PER_PROMPT})"
                            )
                            # Continue to retry
                            continue
                        elif retry_count > MAX_RETRIES_PER_PROMPT:
                            # Max retries reached, skip this prompt
                            error_count += 1
                            skipped_count += 1
                            logger.warning(
                                f"Skipping prompt {prompt_item.id} after {MAX_RETRIES_PER_PROMPT} failed attempts: {error_msg}"
                            )
                            success = True  # Mark as "handled" to exit loop
                        else:
                            # Other error, log and continue
                            logger.error(
                                f"Error analyzing prompt {prompt_item.id} (attempt {retry_count}): {e}",
                                exc_info=True
                            )
                            if retry_count > MAX_RETRIES_PER_PROMPT:
                                error_count += 1
                                skipped_count += 1
                                success = True  # Exit retry loop
            
            logger.info(
                f"Background analysis completed: {analyzed_count} analyzed, "
                f"{error_count} errors, {skipped_count} skipped"
            )
            
        except Exception as e:
            logger.error(f"Error in background prompt analysis: {e}", exc_info=True)
        finally:
            db.close()


# Global worker instance
_worker: Optional[AgentWorker] = None


def get_worker() -> AgentWorker:
    """Get or create the global worker instance."""
    global _worker
    if _worker is None:
        _worker = AgentWorker()
    return _worker


async def start_worker():
    """Start the background worker (called on app startup)."""
    worker = get_worker()
    await worker.start()


async def stop_worker():
    """Stop the background worker (called on app shutdown)."""
    worker = get_worker()
    await worker.stop()
