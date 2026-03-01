"""
Analytics endpoint — aggregated data for charts and dashboards.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.models.database import Insight, Prompt, PromptVersion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


class CategoryDistribution(BaseModel):
    category: str
    count: int


class QualityOverTime(BaseModel):
    date: str
    avg_score: float
    prompt_count: int


class TagDistribution(BaseModel):
    tag: str
    count: int


class AnalyticsResponse(BaseModel):
    category_distribution: List[CategoryDistribution]
    tag_distribution: List[TagDistribution]
    quality_over_time: List[QualityOverTime]
    total_prompts: int
    total_favorites: int
    total_versions: int
    total_insights: int
    avg_quality_score: float
    prompts_improved_pct: float


def _quality_score(prompt: Prompt, version_count: int, insight_count: int) -> int:
    """Replicate the quality score logic from PromptService."""
    score = 0
    if prompt.description:
        score += 20
    if prompt.category:
        score += 15
    if prompt.tags:
        score += 10
    if version_count > 1:
        score += min((version_count - 1) * 10, 30)
    if insight_count > 0:
        score += 15
    if prompt.is_favorite:
        score += 10
    return min(score, 100)


@router.get("", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Return aggregated analytics data for charts."""
    prompts = db.query(Prompt).all()
    total_prompts = len(prompts)
    total_favorites = sum(1 for p in prompts if p.is_favorite)

    total_versions = db.query(func.count(PromptVersion.id)).scalar() or 0
    total_insights = db.query(func.count(Insight.id)).scalar() or 0

    # Version counts per prompt
    version_counts_rows = db.query(
        PromptVersion.prompt_id, func.count(PromptVersion.id)
    ).group_by(PromptVersion.prompt_id).all()
    version_counts = {row[0]: row[1] for row in version_counts_rows}

    # Insight counts per prompt
    insight_counts_rows = db.query(
        Insight.prompt_id, func.count(Insight.id)
    ).group_by(Insight.prompt_id).all()
    insight_counts = {row[0]: row[1] for row in insight_counts_rows}

    # Category distribution
    cat_map: dict[str, int] = {}
    for p in prompts:
        cat = getattr(p.category, "value", None) or (str(p.category) if p.category else "Sem categoria")
        cat_map[cat] = cat_map.get(cat, 0) + 1
    category_distribution = [
        CategoryDistribution(category=k, count=v)
        for k, v in sorted(cat_map.items(), key=lambda x: -x[1])
    ]

    # Tag distribution
    tag_map: dict[str, int] = {}
    for p in prompts:
        for tag in (p.tags or []):
            tag_map[tag] = tag_map.get(tag, 0) + 1
    tag_distribution = [
        TagDistribution(tag=k, count=v)
        for k, v in sorted(tag_map.items(), key=lambda x: -x[1])[:15]
    ]

    # Quality scores
    scores = [
        _quality_score(p, version_counts.get(p.id, 0), insight_counts.get(p.id, 0))
        for p in prompts
    ]
    avg_quality_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    improved = sum(1 for p in prompts if version_counts.get(p.id, 0) > 1)
    prompts_improved_pct = round(improved / total_prompts * 100, 1) if total_prompts else 0.0

    # Quality over time — group prompts by week of creation
    week_data: dict[str, list[int]] = {}
    for p, score in zip(prompts, scores):
        if not p.created_at:
            continue
        # ISO week start (Monday)
        week_start = p.created_at - timedelta(days=p.created_at.weekday())
        key = week_start.strftime("%Y-%m-%d")
        week_data.setdefault(key, []).append(score)

    quality_over_time = [
        QualityOverTime(
            date=date,
            avg_score=round(sum(vals) / len(vals), 1),
            prompt_count=len(vals),
        )
        for date, vals in sorted(week_data.items())
    ]

    return AnalyticsResponse(
        category_distribution=category_distribution,
        tag_distribution=tag_distribution,
        quality_over_time=quality_over_time,
        total_prompts=total_prompts,
        total_favorites=total_favorites,
        total_versions=total_versions,
        total_insights=total_insights,
        avg_quality_score=avg_quality_score,
        prompts_improved_pct=prompts_improved_pct,
    )
