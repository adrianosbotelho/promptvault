"""
Admin API endpoints.

Endpoints for administrative functions including worker configuration.
"""
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.dependencies import get_db, get_current_user
from app.models.database import User
from app.models.worker_config import WorkerConfigResponse, WorkerConfigUpdate
from app.services.worker_config_service import WorkerConfigService

router = APIRouter(prefix="/admin", tags=["admin"])


def handle_db_error(e: Exception) -> HTTPException:
    """Handle database connection errors and return appropriate HTTP response."""
    if isinstance(e, OperationalError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed. Please check your DATABASE_URL configuration and ensure PostgreSQL is running."
        )
    elif isinstance(e, SQLAlchemyError):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    else:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get(
    "/worker/config",
    response_model=WorkerConfigResponse,
    status_code=status.HTTP_200_OK
)
async def get_worker_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current worker configuration.
    
    Returns:
        WorkerConfigResponse with current configuration
    """
    try:
        return WorkerConfigService.get_config(db)
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error getting worker configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting worker configuration: {str(e)}"
        )


@router.put(
    "/worker/config",
    response_model=WorkerConfigResponse,
    status_code=status.HTTP_200_OK
)
async def update_worker_config(
    config_update: WorkerConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update worker configuration.
    
    Args:
        config_update: Updated configuration values
        
    Returns:
        WorkerConfigResponse with updated configuration
        
    Note:
        Changes take effect after server restart or worker restart.
    """
    try:
        updated_config = WorkerConfigService.update_config(db, config_update)
        
        # Note: The worker will need to be restarted or the settings reloaded
        # for changes to take effect. This is handled by the worker reading
        # from the database on each cycle.
        
        return updated_config
    except (OperationalError, SQLAlchemyError) as e:
        raise handle_db_error(e)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error updating worker configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating worker configuration: {str(e)}"
        )
