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

# Worker configuration - reads from database, falls back to settings
def get_worker_config_from_db(db: Session) -> dict:
    """Get worker configuration from database, with fallback to settings."""
    try:
        from app.services.worker_config_service import WorkerConfigService
        config = WorkerConfigService.get_config(db)
        return {
            'enabled': config.enabled,
            'interval_minutes': config.interval_minutes,
            'max_prompts': config.max_prompts,
            'max_retries': config.max_retries,
            'use_free_apis_only': config.use_free_apis_only
        }
    except Exception as e:
        logger.warning(f"Could not load worker config from database: {e}. Using settings defaults.")
        return {
            'enabled': getattr(settings, 'AGENT_WORKER_ENABLED', False),
            'interval_minutes': getattr(settings, 'AGENT_WORKER_INTERVAL_MINUTES', 5),
            'max_prompts': getattr(settings, 'AGENT_WORKER_MAX_PROMPTS', 5),
            'max_retries': getattr(settings, 'AGENT_WORKER_MAX_RETRIES', 2),
            'use_free_apis_only': getattr(settings, 'AGENT_WORKER_USE_FREE_APIS_ONLY', True)
        }


class AgentWorker:
    """Background worker that periodically analyzes prompts."""
    
    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the background worker."""
        # Check if worker is enabled (from database or settings)
        db = SessionLocal()
        try:
            worker_config = get_worker_config_from_db(db)
            if not worker_config['enabled']:
                logger.info("Agent worker is disabled. Enable it in the admin panel or set AGENT_WORKER_ENABLED=true.")
                return
        finally:
            db.close()
        
        if self.running:
            logger.warning("Agent worker is already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Agent worker started. Configuration will be read from database on each cycle.")
    
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
                # Read configuration from database on each cycle
                db = SessionLocal()
                try:
                    worker_config = get_worker_config_from_db(db)
                    
                    # Check if worker is still enabled
                    if not worker_config['enabled']:
                        logger.info("Worker disabled in configuration. Stopping worker.")
                        self.running = False
                        break
                    
                    # Use configuration from database
                    interval_minutes = worker_config['interval_minutes']
                    
                    await self._analyze_latest_prompts(
                        max_prompts=worker_config['max_prompts'],
                        max_retries=worker_config['max_retries'],
                        use_free_apis_only=worker_config['use_free_apis_only']
                    )
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in agent worker loop: {e}", exc_info=True)
            
            # Wait for the interval before next run (read from config)
            if self.running:
                db = SessionLocal()
                try:
                    worker_config = get_worker_config_from_db(db)
                    interval_minutes = worker_config['interval_minutes']
                finally:
                    db.close()
                await asyncio.sleep(interval_minutes * 60)
    
    async def run_manual_analysis(self, max_prompts: Optional[int] = None) -> dict:
        """
        Run a manual analysis of latest prompts (one-time execution).
        
        Args:
            max_prompts: Maximum number of prompts to analyze (defaults to database config)
            
        Returns:
            dict with analysis results: {analyzed_count, error_count, skipped_count}
        """
        # Get config from database for manual run
        db = SessionLocal()
        try:
            worker_config = get_worker_config_from_db(db)
            return await self._analyze_latest_prompts(
                max_prompts=max_prompts or worker_config['max_prompts'],
                max_retries=worker_config['max_retries'],
                use_free_apis_only=worker_config['use_free_apis_only']
            )
        finally:
            db.close()
    
    async def _analyze_latest_prompts(
        self, 
        max_prompts: Optional[int] = None,
        max_retries: Optional[int] = None,
        use_free_apis_only: Optional[bool] = None
    ):
        """Analyze the latest prompts."""
        db: Session = SessionLocal()
        
        # Get config from database if not provided
        if max_prompts is None or max_retries is None or use_free_apis_only is None:
            worker_config = get_worker_config_from_db(db)
            max_prompts = max_prompts or worker_config['max_prompts']
            max_retries = max_retries if max_retries is not None else worker_config['max_retries']
            use_free_apis_only = use_free_apis_only if use_free_apis_only is not None else worker_config['use_free_apis_only']
        
        max_to_analyze = max_prompts
        max_retries_per_prompt = max_retries
        use_free_only = use_free_apis_only
        
        try:
            # Get latest prompts
            prompt_list = PromptService.list_prompts(db)
            
            if not prompt_list:
                logger.debug("No prompts found to analyze")
                return {"analyzed_count": 0, "error_count": 0, "skipped_count": 0}
            
            # Sort by updated_at descending and take top N
            sorted_prompts = sorted(
                prompt_list,
                key=lambda p: p.updated_at,
                reverse=True
            )[:max_to_analyze]
            
            logger.info(f"Analyzing {len(sorted_prompts)} latest prompts...")
            
            # Initialize agent service with free API provider if configured
            from app.core.llm_provider import LLMProvider
            from app.providers.groq_provider import GroqProvider
            from app.providers.huggingface_provider import HuggingFaceProvider
            from app.providers.mock_provider import MockLLMProvider
            
            llm_provider: Optional[LLMProvider] = None
            
            if use_free_only:
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
                
                while retry_count <= max_retries_per_prompt and not success:
                    try:
                        if retry_count > 0:
                            # Exponential backoff: wait 2^retry_count seconds
                            wait_time = 2 ** retry_count
                            logger.debug(f"Retrying prompt {prompt_item.id} after {wait_time}s (attempt {retry_count + 1}/{max_retries_per_prompt + 1})")
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
                        
                        if is_rate_limit and retry_count <= max_retries_per_prompt:
                            logger.warning(
                                f"Rate limit encountered for prompt {prompt_item.id}. "
                                f"Will retry (attempt {retry_count}/{max_retries_per_prompt})"
                            )
                            # Continue to retry
                            continue
                        elif retry_count > max_retries_per_prompt:
                            # Max retries reached, skip this prompt
                            error_count += 1
                            skipped_count += 1
                            logger.warning(
                                f"Skipping prompt {prompt_item.id} after {max_retries_per_prompt} failed attempts: {error_msg}"
                            )
                            success = True  # Mark as "handled" to exit loop
                        else:
                            # Other error, log and continue
                            logger.error(
                                f"Error analyzing prompt {prompt_item.id} (attempt {retry_count}): {e}",
                                exc_info=True
                            )
                            if retry_count > max_retries_per_prompt:
                                error_count += 1
                                skipped_count += 1
                                success = True  # Exit retry loop
            
            result = {
                "analyzed_count": analyzed_count,
                "error_count": error_count,
                "skipped_count": skipped_count
            }
            
            logger.info(
                f"Background analysis completed: {analyzed_count} analyzed, "
                f"{error_count} errors, {skipped_count} skipped"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in background prompt analysis: {e}", exc_info=True)
            return {"analyzed_count": 0, "error_count": 1, "skipped_count": 0}
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
