from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import Prompt, PromptVersion
from app.models.prompt import PromptCreate, PromptUpdate, PromptResponse, PromptListItem


class PromptService:
    """Prompt service following clean architecture."""
    
    @staticmethod
    def create_prompt(db: Session, prompt_data: PromptCreate) -> Prompt:
        """Create a new prompt with initial version."""
        # Check if prompt name already exists
        existing_prompt = db.query(Prompt).filter(Prompt.name == prompt_data.name).first()
        if existing_prompt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prompt with name '{prompt_data.name}' already exists"
            )
        
        # Create prompt
        db_prompt = Prompt(
            name=prompt_data.name,
            description=prompt_data.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_prompt)
        db.flush()  # Flush to get the prompt ID
        
        # Create initial version (version 1)
        db_version = PromptVersion(
            prompt_id=db_prompt.id,
            version=1,
            content=prompt_data.content,
            created_at=datetime.utcnow()
        )
        db.add(db_version)
        db.commit()
        db.refresh(db_prompt)
        
        return db_prompt
    
    @staticmethod
    def update_prompt(
        db: Session, 
        prompt_id: int, 
        prompt_data: PromptUpdate
    ) -> Prompt:
        """Update prompt and create new version if content changed."""
        db_prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not db_prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        
        # Update name if provided
        if prompt_data.name is not None:
            # Check if new name conflicts with existing prompt
            existing = db.query(Prompt).filter(
                Prompt.name == prompt_data.name,
                Prompt.id != prompt_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Prompt with name '{prompt_data.name}' already exists"
                )
            db_prompt.name = prompt_data.name
        
        # Update description if provided
        if prompt_data.description is not None:
            db_prompt.description = prompt_data.description
        
        # Create new version if content is provided
        if prompt_data.content is not None:
            # Get the latest version number
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt_id
            ).scalar() or 0
            
            # Create new version
            new_version = PromptVersion(
                prompt_id=prompt_id,
                version=latest_version + 1,
                content=prompt_data.content,
                created_at=datetime.utcnow()
            )
            db.add(new_version)
        
        # Update timestamp
        db_prompt.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_prompt)
        
        return db_prompt
    
    @staticmethod
    def list_prompts(db: Session) -> List[PromptListItem]:
        """List all prompts with their latest version number."""
        prompts = db.query(Prompt).order_by(Prompt.updated_at.desc()).all()
        
        result = []
        for prompt in prompts:
            # Get latest version number
            latest_version = db.query(func.max(PromptVersion.version)).filter(
                PromptVersion.prompt_id == prompt.id
            ).scalar()
            
            result.append(PromptListItem(
                id=prompt.id,
                name=prompt.name,
                description=prompt.description,
                created_at=prompt.created_at,
                updated_at=prompt.updated_at,
                latest_version=latest_version
            ))
        
        return result
    
    @staticmethod
    def get_prompt(db: Session, prompt_id: int) -> Prompt:
        """Get a prompt by ID with all versions."""
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id {prompt_id} not found"
            )
        return prompt
