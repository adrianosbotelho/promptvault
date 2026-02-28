"""
Mentor summary service.

Aggregates recent insights into observations, architectural alerts,
and detected patterns for the Architect Mentor dashboard panel.
"""

import logging
from typing import Any, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.database import Insight, Prompt, ArchitectProfile
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


def _get_profile_context(db: Session) -> Optional[str]:
    """Build a short context string from the architect profile, if one exists."""
    profile = db.query(ArchitectProfile).first()
    if not profile:
        return None
    parts: List[str] = []
    if profile.common_domains:
        parts.append(f"Domínios frequentes: {', '.join(profile.common_domains)}")
    if profile.preferred_patterns:
        parts.append(f"Padrões preferidos: {', '.join(profile.preferred_patterns)}")
    if profile.optimization_focus:
        parts.append(f"Foco: {', '.join(profile.optimization_focus)}")
    return "; ".join(parts) if parts else None


def _profile_boost(item_text: str, profile_keywords: List[str]) -> bool:
    """Return True if the item text matches any profile keyword (case-insensitive)."""
    lower = item_text.lower()
    return any(kw.lower() in lower for kw in profile_keywords)


def get_mentor_summary(db: Session, domain: Optional[str] = None) -> MentorSummaryResponse:
    """
    Build mentor summary from recent insights.

    - recent_observations: from improvement_ideas (description/title)
    - architectural_alerts: from warnings (message)
    - detected_patterns: from reusable_patterns (name/description)

    When an ArchitectProfile exists, items that match the profile's preferred_patterns,
    common_domains, or optimization_focus are boosted to the top of each section.

    Args:
        domain: Optional domain filter (e.g. "delphi", "oracle"). When provided,
                only insights from prompts whose category matches the domain are included.
    """
    observations: List[MentorSummaryItem] = []
    alerts: List[MentorSummaryItem] = []
    patterns: List[MentorSummaryItem] = []

    # Load profile keywords for boosting
    profile = db.query(ArchitectProfile).first()
    profile_keywords: List[str] = []
    if profile:
        for field in (profile.preferred_patterns, profile.common_domains, profile.optimization_focus):
            if field:
                profile_keywords.extend(field)

    query = db.query(Insight).order_by(desc(Insight.created_at))

    if domain:
        # Map domain to category values stored in Prompt.category
        domain_lower = domain.lower()
        category_map: dict = {
            "delphi": ["delphi"],
            "oracle": ["oracle"],
            "plsql": ["oracle"],
            "arquitetura": ["arquitetura"],
        }
        categories = category_map.get(domain_lower, [domain_lower])
        query = (
            query
            .join(Prompt, Prompt.id == Insight.prompt_id)
            .filter(Prompt.category.in_(categories))
        )

    insights = query.limit(MAX_INSIGHTS).all()

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

    # Boost profile-relevant items to the top of each section
    if profile_keywords:
        observations.sort(key=lambda i: not _profile_boost(i.text, profile_keywords))
        alerts.sort(key=lambda i: not _profile_boost(i.text, profile_keywords))
        patterns.sort(key=lambda i: not _profile_boost(i.text, profile_keywords))

    return MentorSummaryResponse(
        recent_observations=observations,
        architectural_alerts=alerts,
        detected_patterns=patterns,
    )
