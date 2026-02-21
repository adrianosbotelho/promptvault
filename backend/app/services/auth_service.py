from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserLogin, UserCreate, UserResponse
from app.models.database import User


class AuthService:
    """Authentication service following clean architecture."""
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user by email and password."""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def login(db: Session, login_data: UserLogin) -> dict:
        """Login a user and return JWT token."""
        user = AuthService.authenticate_user(
            db, 
            email=login_data.email, 
            password=login_data.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.email})
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user (for single-user system initialization)."""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists"
            )
        
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
