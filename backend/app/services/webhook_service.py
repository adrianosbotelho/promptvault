"""
Webhook service: fires outbound HTTP POST events to configured URLs.
Supports generic webhooks (n8n, Make.com, Zapier) and Slack/Discord formatted payloads.
"""
import logging
import asyncio
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = 10  # seconds


async def _post(url: str, payload: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return True
    except Exception as exc:
        logger.warning(f"Webhook delivery failed to {url}: {exc}")
        return False


def _slack_payload(event: str, data: dict) -> dict:
    """Format a Slack-compatible incoming webhook payload."""
    title = {
        "prompt.created": ":memo: Novo prompt criado",
        "prompt.improved": ":sparkles: Prompt melhorado",
        "insight.generated": ":bulb: Novo insight gerado",
    }.get(event, f":bell: Evento: {event}")

    lines = [f"*{title}*"]
    if data.get("name"):
        lines.append(f"> *Prompt:* {data['name']}")
    if data.get("category"):
        lines.append(f"> *Categoria:* {data['category']}")
    if data.get("improvement_count"):
        lines.append(f"> *Ideias de melhoria:* {data['improvement_count']}")
    if data.get("provider"):
        lines.append(f"> *Melhorado por:* {data['provider']}")

    return {"text": "\n".join(lines)}


def _discord_payload(event: str, data: dict) -> dict:
    """Format a Discord webhook payload (uses 'content' key)."""
    slack = _slack_payload(event, data)
    # Discord uses 'content' instead of 'text'; strip Slack markdown bold markers
    return {"content": slack["text"].replace("*", "**")}


async def fire_event(configs: list[dict], event: str, data: dict) -> None:
    """
    Fire an event to all matching enabled integration configs.

    configs: list of IntegrationConfig.config dicts with keys:
        - integration_type: "webhook" | "slack" | "discord"
        - url: target URL
        - events: list of event names to listen to (None = all)
        - enabled: bool
    """
    tasks = []
    for cfg in configs:
        if not cfg.get("enabled", True):
            continue
        events_filter = cfg.get("events")
        if events_filter and event not in events_filter:
            continue

        url = cfg.get("url") or cfg.get("config", {}).get("url")
        if not url:
            continue

        itype = cfg.get("integration_type", "webhook")
        if itype == "slack":
            payload = _slack_payload(event, data)
        elif itype == "discord":
            payload = _discord_payload(event, data)
        else:
            payload = {"event": event, "data": data}

        tasks.append(_post(url, payload))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        ok = sum(1 for r in results if r is True)
        logger.info(f"Webhook event '{event}': {ok}/{len(tasks)} delivered")


def fire_event_sync(configs: list[dict], event: str, data: dict) -> None:
    """Synchronous wrapper — runs in a new event loop if needed."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(fire_event(configs, event, data))
        else:
            loop.run_until_complete(fire_event(configs, event, data))
    except RuntimeError:
        asyncio.run(fire_event(configs, event, data))
