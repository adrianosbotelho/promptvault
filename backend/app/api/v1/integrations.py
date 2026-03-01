"""
Integrations API: CRUD for integration configs + export endpoints.
"""
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.database import IntegrationConfig, Prompt, PromptVersion
from app.services import github_service, notion_service, webhook_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class IntegrationConfigCreate(BaseModel):
    integration_type: str  # github | webhook | slack | discord | notion
    name: Optional[str] = None
    config: dict[str, Any]
    enabled: bool = True
    events: Optional[list[str]] = None


class IntegrationConfigResponse(BaseModel):
    id: int
    integration_type: str
    name: Optional[str]
    config: dict[str, Any]
    enabled: bool
    events: Optional[list[str]]

    model_config = {"from_attributes": True}


class ExportResult(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_latest_version(prompt: Prompt) -> Optional[PromptVersion]:
    if not prompt.versions:
        return None
    return max(prompt.versions, key=lambda v: v.version)


def _get_configs_by_type(db: Session, itype: str) -> list[IntegrationConfig]:
    return db.query(IntegrationConfig).filter(
        IntegrationConfig.integration_type == itype,
        IntegrationConfig.enabled == True,
    ).all()


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[IntegrationConfigResponse])
def list_integrations(db: Session = Depends(get_db)):
    return db.query(IntegrationConfig).order_by(IntegrationConfig.integration_type).all()


@router.post("", response_model=IntegrationConfigResponse, status_code=status.HTTP_201_CREATED)
def create_integration(data: IntegrationConfigCreate, db: Session = Depends(get_db)):
    cfg = IntegrationConfig(
        integration_type=data.integration_type,
        name=data.name,
        config=data.config,
        enabled=data.enabled,
        events=data.events,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.put("/{cfg_id}", response_model=IntegrationConfigResponse)
def update_integration(cfg_id: int, data: IntegrationConfigCreate, db: Session = Depends(get_db)):
    cfg = db.query(IntegrationConfig).filter(IntegrationConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Integration not found")
    cfg.integration_type = data.integration_type
    cfg.name = data.name
    cfg.config = data.config
    cfg.enabled = data.enabled
    cfg.events = data.events
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/{cfg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(cfg_id: int, db: Session = Depends(get_db)):
    cfg = db.query(IntegrationConfig).filter(IntegrationConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(cfg)
    db.commit()


# ── GitHub export ─────────────────────────────────────────────────────────────

@router.post("/github/export/{prompt_id}", response_model=ExportResult)
async def github_export(prompt_id: int, db: Session = Depends(get_db)):
    cfgs = _get_configs_by_type(db, "github")
    if not cfgs:
        raise HTTPException(status_code=400, detail="Nenhuma integração GitHub configurada")

    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt não encontrado")

    version = _get_latest_version(prompt)
    if not version:
        raise HTTPException(status_code=400, detail="Prompt sem versão")

    cfg = cfgs[0].config
    try:
        result = await github_service.export_prompt(
            token=cfg["token"],
            owner=cfg["owner"],
            repo=cfg["repo"],
            prompt_name=prompt.name,
            description=prompt.description,
            category=prompt.category.value if prompt.category else None,
            tags=prompt.tags,
            content=version.content,
            version=version.version,
            folder=cfg.get("folder", "prompts"),
        )
        action = "criado" if result["created"] else "atualizado"
        return ExportResult(success=True, message=f"Arquivo {action} no GitHub", url=result["url"])
    except Exception as exc:
        logger.error(f"GitHub export failed: {exc}")
        raise HTTPException(status_code=502, detail=f"Falha ao exportar para GitHub: {exc}")


@router.post("/github/validate", response_model=ExportResult)
async def github_validate(body: dict[str, Any]):
    try:
        ok = await github_service.validate_token(
            token=body["token"],
            owner=body["owner"],
            repo=body["repo"],
        )
        if ok:
            return ExportResult(success=True, message="Token e repositório válidos")
        return ExportResult(success=False, message="Token inválido ou repositório não encontrado")
    except Exception as exc:
        return ExportResult(success=False, message=str(exc))


# ── Notion export ─────────────────────────────────────────────────────────────

@router.post("/notion/export/{prompt_id}", response_model=ExportResult)
async def notion_export(prompt_id: int, db: Session = Depends(get_db)):
    cfgs = _get_configs_by_type(db, "notion")
    if not cfgs:
        raise HTTPException(status_code=400, detail="Nenhuma integração Notion configurada")

    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt não encontrado")

    version = _get_latest_version(prompt)
    if not version:
        raise HTTPException(status_code=400, detail="Prompt sem versão")

    cfg = cfgs[0].config
    try:
        result = await notion_service.export_prompt(
            token=cfg["token"],
            database_id=cfg["database_id"],
            prompt_name=prompt.name,
            description=prompt.description,
            category=prompt.category.value if prompt.category else None,
            tags=prompt.tags,
            content=version.content,
            version=version.version,
        )
        return ExportResult(success=True, message="Página criada no Notion", url=result["url"])
    except Exception as exc:
        logger.error(f"Notion export failed: {exc}")
        raise HTTPException(status_code=502, detail=f"Falha ao exportar para Notion: {exc}")


@router.post("/notion/validate", response_model=ExportResult)
async def notion_validate(body: dict[str, Any]):
    try:
        ok = await notion_service.validate_token(
            token=body["token"],
            database_id=body["database_id"],
        )
        if ok:
            return ExportResult(success=True, message="Token e database válidos")
        return ExportResult(success=False, message="Token inválido ou database não encontrado")
    except Exception as exc:
        return ExportResult(success=False, message=str(exc))


# ── Webhook test ──────────────────────────────────────────────────────────────

@router.post("/webhook/test/{cfg_id}", response_model=ExportResult)
async def webhook_test(cfg_id: int, db: Session = Depends(get_db)):
    cfg = db.query(IntegrationConfig).filter(IntegrationConfig.id == cfg_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    test_data = {"name": "Prompt de Teste", "category": "delphi", "event": "test"}
    flat = {**cfg.config, "integration_type": cfg.integration_type, "enabled": True}
    ok = await webhook_service._post(
        flat.get("url", ""),
        {"event": "test", "data": test_data},
    )
    if ok:
        return ExportResult(success=True, message="Webhook disparado com sucesso")
    return ExportResult(success=False, message="Falha ao disparar webhook — verifique a URL")
