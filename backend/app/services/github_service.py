"""
GitHub service: export prompts as Markdown files to a GitHub repository
using the GitHub Contents REST API.
"""
import base64
import logging
import re
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"
TIMEOUT = 15


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug[:80]


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _build_markdown(prompt_name: str, description: Optional[str], category: Optional[str],
                    tags: Optional[list], content: str, version: int) -> str:
    lines = [f"# {prompt_name}", ""]
    if description:
        lines += [description, ""]
    meta = []
    if category:
        meta.append(f"**Categoria:** {category}")
    if tags:
        meta.append(f"**Tags:** {', '.join(tags)}")
    meta.append(f"**Versão:** v{version}")
    lines += meta + ["", "---", "", "```", content, "```", ""]
    return "\n".join(lines)


async def export_prompt(
    token: str,
    owner: str,
    repo: str,
    prompt_name: str,
    description: Optional[str],
    category: Optional[str],
    tags: Optional[list],
    content: str,
    version: int,
    folder: str = "prompts",
) -> dict:
    """
    Create or update a prompt file in the GitHub repository.
    Returns {"url": str, "sha": str, "created": bool}.
    """
    slug = _slugify(prompt_name)
    path = f"{folder}/{slug}.md"
    markdown = _build_markdown(prompt_name, description, category, tags, content, version)
    encoded = base64.b64encode(markdown.encode()).decode()

    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    headers = _headers(token)

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Check if file already exists to get its SHA (required for updates)
        existing_sha = None
        get_resp = await client.get(url, headers=headers)
        if get_resp.status_code == 200:
            existing_sha = get_resp.json().get("sha")

        commit_message = (
            f"update: {prompt_name} (v{version})" if existing_sha
            else f"feat: add prompt {prompt_name}"
        )

        body: dict = {
            "message": commit_message,
            "content": encoded,
        }
        if existing_sha:
            body["sha"] = existing_sha

        put_resp = await client.put(url, headers=headers, json=body)
        put_resp.raise_for_status()

        data = put_resp.json()
        html_url = data.get("content", {}).get("html_url", "")
        sha = data.get("content", {}).get("sha", "")
        return {"url": html_url, "sha": sha, "created": existing_sha is None}


async def list_exported(token: str, owner: str, repo: str, folder: str = "prompts") -> list[str]:
    """Return list of filenames already exported to the repo folder."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{folder}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=_headers(token))
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return [item["name"] for item in resp.json() if item["type"] == "file"]


async def validate_token(token: str, owner: str, repo: str) -> bool:
    """Check that the token can access the given repository."""
    url = f"{GITHUB_API}/repos/{owner}/{repo}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=_headers(token))
        return resp.status_code == 200
