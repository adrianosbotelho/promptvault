"""
Service for managing worker configuration.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.database import WorkerConfig
from app.models.worker_config import WorkerConfigUpdate, WorkerConfigResponse

logger = logging.getLogger(__name__)


class WorkerConfigService:
    """Service for managing worker configuration."""
    
    @staticmethod
    def get_config(db: Session) -> WorkerConfigResponse:
        """
        Get current worker configuration.
        If no configuration exists, create default one.
        
        Args:
            db: Database session
            
        Returns:
            WorkerConfigResponse with current configuration
        """
        try:
            config = db.query(WorkerConfig).filter(WorkerConfig.id == 1).first()
            
            if not config:
                # Create default configuration
                config = WorkerConfig(
                    id=1,
                    enabled="false",
                    interval_minutes=5,
                    max_prompts=5,
                    max_retries=2,
                    use_free_apis_only="true"
                )
                db.add(config)
                db.commit()
                db.refresh(config)
                logger.info("Created default worker configuration")
            
            # Convert string to bool for enabled and use_free_apis_only
            return WorkerConfigResponse(
                enabled=config.enabled.lower() == "true",
                interval_minutes=config.interval_minutes,
                max_prompts=config.max_prompts,
                max_retries=config.max_retries,
                use_free_apis_only=config.use_free_apis_only.lower() == "true",
                updated_at=config.updated_at
            )
        except SQLAlchemyError as e:
            logger.error(f"Error getting worker configuration: {e}")
            db.rollback()
            raise
    
    @staticmethod
    def update_config(db: Session, config_update: WorkerConfigUpdate) -> WorkerConfigResponse:
        """
        Update worker configuration.
        
        Args:
            db: Database session
            config_update: Updated configuration values
            
        Returns:
            WorkerConfigResponse with updated configuration
        """
        try:
            config = db.query(WorkerConfig).filter(WorkerConfig.id == 1).first()
            
            if not config:
                # Create new configuration
                config = WorkerConfig(id=1)
                db.add(config)
            
            # Update values (convert bool to string for database storage)
            config.enabled = "true" if config_update.enabled else "false"
            config.interval_minutes = config_update.interval_minutes
            config.max_prompts = config_update.max_prompts
            config.max_retries = config_update.max_retries
            config.use_free_apis_only = "true" if config_update.use_free_apis_only else "false"
            
            db.commit()
            db.refresh(config)
            
            logger.info(f"Worker configuration updated: enabled={config.enabled}, interval={config.interval_minutes}min")
            
            return WorkerConfigResponse(
                enabled=config.enabled.lower() == "true",
                interval_minutes=config.interval_minutes,
                max_prompts=config.max_prompts,
                max_retries=config.max_retries,
                use_free_apis_only=config.use_free_apis_only.lower() == "true",
                updated_at=config.updated_at
            )
        except SQLAlchemyError as e:
            logger.error(f"Error updating worker configuration: {e}")
            db.rollback()
            raise
