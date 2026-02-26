"""
Mentor summary service.

Aggregates recent insights into observations, architectural alerts,
and detected patterns for the Architect Mentor dashboard panel.
"""

import logging
from typing import Any, List

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import Insight, Prompt
from app.models.mentor import MentorSummaryItem, MentorSummaryResponse

logger = logging.getLogger(__name__)

# Max insights to scan; max items per section in response
MAX_INSIGHTS = 30
MAX_ITEMS_PER_SECTION = 15


def _item_to_text(item: Any) -> str:
    """Convert a JSON item (dict or string) to a single display string."""
    if item is None:
        return ""
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        # Agent format: ImprovementIdea (title, description), Warning (message), ReusablePattern (name, description)
        parts = []
        for key in ("message", "description", "title", "name", "suggestion", "reasoning"):
            if key in item and item[key]:
                parts.append(str(item[key]).strip())
        if parts:
            return " — ".join(parts)
        return str(item)
    return str(item)


def get_mentor_summary(db: Session) -> MentorSummaryResponse:
    """
    Build mentor summary from recent insights.

    - recent_observations: from improvement_ideas (description/title)
    - architectural_alerts: from warnings (message)
    - detected_patterns: from reusable_patterns (name/description)
    """
    observations: List[MentorSummaryItem] = []
    alerts: List[MentorSummaryItem] = []
    patterns: List[MentorSummaryItem] = []

    insights = (
        db.query(Insight)
        .order_by(desc(Insight.created_at))
        .limit(MAX_INSIGHTS)
        .all()
    )

    # Load prompt names in one query to avoid N+1
    prompt_ids = list({i.prompt_id for i in insights if i.prompt_id is not None})
    prompt_names: dict = {}
    if prompt_ids:
        for p in db.query(Prompt.id, Prompt.name).filter(Prompt.id.in_(prompt_ids)).all():
            prompt_names[p.id] = p.name

    for insight in insights:
        created = insight.created_at
        prompt_id = insight.prompt_id
        prompt_name = prompt_names.get(prompt_id) if prompt_id else None

        for raw in insight.improvement_ideas or []:
            text = _item_to_text(raw)
            if text and len(observations) < MAX_ITEMS_PER_SECTION:
                observations.append(
                    MentorSummaryItem(
                        text=text,
                        prompt_id=prompt_id,
                        prompt_name=prompt_name,
                        created_at=created,
                    )
                )

        for raw in insight.warnings or []:
            text = _item_to_text(raw)
            if text and len(alerts) < MAX_ITEMS_PER_SECTION:
                alerts.append(
                    MentorSummaryItem(
                        text=text,
                        prompt_id=prompt_id,
                        prompt_name=prompt_name,
                        created_at=created,
                    )
                )

        for raw in insight.reusable_patterns or []:
            text = _item_to_text(raw)
            if text and len(patterns) < MAX_ITEMS_PER_SECTION:
                patterns.append(
                    MentorSummaryItem(
                        text=text,
                        prompt_id=prompt_id,
                        prompt_name=prompt_name,
                        created_at=created,
                    )
                )

    return MentorSummaryResponse(
        recent_observations=observations,
        architectural_alerts=alerts,
        detected_patterns=patterns,
    )
