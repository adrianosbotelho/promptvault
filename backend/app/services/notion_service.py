"""
Notion service: export prompts as pages in a Notion database
using the Notion API v1.
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
TIMEOUT = 15


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _chunk_text(text: str, size: int = 1900) -> list[str]:
    """Split text into chunks ≤ size chars (Notion block limit is 2000)."""
    return [text[i:i + size] for i in range(0, len(text), size)]


def _build_page_body(
    database_id: str,
    prompt_name: str,
    description: Optional[str],
    category: Optional[str],
    tags: Optional[list],
    content: str,
    version: int,
) -> dict:
    children = []

    if description:
        children.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": description}}]
            },
        })

    meta_parts = []
    if category:
        meta_parts.append(f"Categoria: {category}")
    if tags:
        meta_parts.append(f"Tags: {', '.join(tags)}")
    meta_parts.append(f"Versão: v{version}")

    children.append({
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [{"type": "text", "text": {"content": " · ".join(meta_parts)}}],
            "icon": {"emoji": "📋"},
        },
    })

    children.append({
        "object": "block",
        "type": "heading_2",
        "heading_2": {
            "rich_text": [{"type": "text", "text": {"content": "Conteúdo do Prompt"}}]
        },
    })

    for chunk in _chunk_text(content):
        children.append({
            "object": "block",
            "type": "code",
            "code": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}],
                "language": "plain text",
            },
        })

    properties: dict = {
        "Name": {
            "title": [{"type": "text", "text": {"content": prompt_name}}]
        },
    }
    if category:
        properties["Category"] = {
            "rich_text": [{"type": "text", "text": {"content": category}}]
        }

    return {
        "parent": {"database_id": database_id},
        "properties": properties,
        "children": children,
    }


async def export_prompt(
    token: str,
    database_id: str,
    prompt_name: str,
    description: Optional[str],
    category: Optional[str],
    tags: Optional[list],
    content: str,
    version: int,
) -> dict:
    """
    Create a new page in the Notion database for the given prompt.
    Returns {"page_id": str, "url": str}.
    """
    body = _build_page_body(database_id, prompt_name, description, category, tags, content, version)

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(f"{NOTION_API}/pages", headers=_headers(token), json=body)
        resp.raise_for_status()
        data = resp.json()
        return {"page_id": data.get("id", ""), "url": data.get("url", "")}


async def validate_token(token: str, database_id: str) -> bool:
    """Check that the token can access the given database."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{NOTION_API}/databases/{database_id}",
            headers=_headers(token),
        )
        return resp.status_code == 200
