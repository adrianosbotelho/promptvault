"""
Prompt Templates API endpoints.

POST /templates          — save a new template
GET  /templates          — list all templates
GET  /templates/{id}     — get a single template
DELETE /templates/{id}   — delete a template
POST /templates/{id}/use — instantiate template by substituting variables
"""
import re
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.models.database import PromptTemplate

router = APIRouter(prefix="/templates", tags=["templates"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    content: str
    specialization: Optional[str] = None
    category: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    content: str
    variables: Optional[List[str]] = None
    specialization: Optional[str] = None
    category: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class TemplateUseRequest(BaseModel):
    variables: dict  # {variable_name: value}


class TemplateUseResponse(BaseModel):
    content: str
    missing_variables: List[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_variables(content: str) -> List[str]:
    """Extract {{variable}} placeholders from content, returning unique names in order."""
    found = re.findall(r'\{\{(\w+)\}\}', content)
    seen: set = set()
    unique: List[str] = []
    for v in found:
        if v not in seen:
            seen.add(v)
            unique.append(v)
    return unique


def _to_response(t: PromptTemplate) -> TemplateResponse:
    return TemplateResponse(
        id=t.id,
        name=t.name,
        description=t.description,
        content=t.content,
        variables=t.variables,
        specialization=t.specialization,
        category=t.category,
        created_at=t.created_at.isoformat(),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(data: TemplateCreate, db: Session = Depends(get_db)) -> TemplateResponse:
    """Save a new reusable prompt template."""
    variables = _extract_variables(data.content)
    template = PromptTemplate(
        name=data.name,
        description=data.description,
        content=data.content,
        variables=variables if variables else None,
        specialization=data.specialization,
        category=data.category,
        created_at=datetime.utcnow(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _to_response(template)


@router.get("", response_model=List[TemplateResponse], status_code=status.HTTP_200_OK)
async def list_templates(db: Session = Depends(get_db)) -> List[TemplateResponse]:
    """List all templates ordered by most recent first."""
    templates = db.query(PromptTemplate).order_by(PromptTemplate.created_at.desc()).all()
    return [_to_response(t) for t in templates]


@router.get("/{template_id}", response_model=TemplateResponse, status_code=status.HTTP_200_OK)
async def get_template(template_id: int, db: Session = Depends(get_db)) -> TemplateResponse:
    """Get a single template by ID."""
    t = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template {template_id} not found")
    return _to_response(t)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a template."""
    t = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template {template_id} not found")
    db.delete(t)
    db.commit()


@router.post("/{template_id}/use", response_model=TemplateUseResponse, status_code=status.HTTP_200_OK)
async def use_template(
    template_id: int,
    data: TemplateUseRequest,
    db: Session = Depends(get_db),
) -> TemplateUseResponse:
    """
    Instantiate a template by substituting {{variable}} placeholders with provided values.
    Returns the filled content and a list of any variables that were not provided.
    """
    t = db.query(PromptTemplate).filter(PromptTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Template {template_id} not found")

    content = t.content
    all_vars = _extract_variables(content)
    missing: List[str] = []

    for var in all_vars:
        value = data.variables.get(var)
        if value is not None:
            content = content.replace(f"{{{{{var}}}}}", str(value))
        else:
            missing.append(var)

    return TemplateUseResponse(content=content, missing_variables=missing)
