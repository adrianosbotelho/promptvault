from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.user import UserLogin, Token
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login endpoint for single-user authentication.
    Returns JWT access token.
    """
    return AuthService.login(db, login_data)
