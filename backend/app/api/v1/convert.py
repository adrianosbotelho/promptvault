"""
Conversion endpoints: files (MarkItDown), URLs (httpx + html2text), YouTube transcripts.
"""
import io
import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/convert", tags=["convert"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

SUPPORTED_EXTENSIONS = {
    ".pdf":  "PDF",
    ".docx": "Word",
    ".doc":  "Word (legado)",
    ".pptx": "PowerPoint",
    ".ppt":  "PowerPoint (legado)",
    ".xlsx": "Excel",
    ".xls":  "Excel (legado)",
    ".html": "HTML",
    ".htm":  "HTML",
    ".csv":  "CSV",
    ".json": "JSON",
    ".xml":  "XML",
    ".txt":  "Texto",
    ".md":   "Markdown",
}

_YT_ID_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?.*v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)


class ConvertResponse(BaseModel):
    markdown: str
    filename: str
    detected_format: str
    char_count: int


class UrlConvertRequest(BaseModel):
    url: str


class UrlConvertResponse(BaseModel):
    markdown: str
    url: str
    title: Optional[str] = None
    char_count: int


class YoutubeConvertRequest(BaseModel):
    url: str
    include_timestamps: bool = False
    language: str = "pt"


class YoutubeConvertResponse(BaseModel):
    markdown: str
    video_id: str
    url: str
    char_count: int


def _get_markitdown():
    from markitdown import MarkItDown
    return MarkItDown(enable_plugins=False)


def _extract_youtube_id(url: str) -> Optional[str]:
    m = _YT_ID_RE.search(url)
    return m.group(1) if m else None


def _html_to_markdown(html: str, base_url: str = "") -> tuple[str, str]:
    """Convert HTML to Markdown using markitdown. Returns (markdown, title)."""
    try:
        md = _get_markitdown()
        stream = io.BytesIO(html.encode("utf-8"))
        result = md.convert_stream(stream, file_extension=".html")
        text = result.text_content or ""
    except Exception:
        # Minimal fallback: strip tags
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s{2,}", "\n", text).strip()

    # Extract title from markdown (first # heading or <title>)
    title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else ""
    if not title:
        t = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
        title = t.group(1).strip() if t else ""

    return text, title


@router.post("/file", response_model=ConvertResponse)
async def convert_file(file: UploadFile = File(...)):
    """
    Convert an uploaded file to Markdown using MarkItDown.
    Supports: PDF, Word, Excel, PowerPoint, HTML, CSV, JSON, XML, TXT.
    Max file size: 10 MB.
    """
    filename = file.filename or "arquivo"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Formato não suportado: '{ext}'. Formatos aceitos: {', '.join(SUPPORTED_EXTENSIONS.keys())}",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo muito grande ({len(raw) // 1024} KB). Limite: 10 MB.",
        )

    try:
        md = _get_markitdown()
        stream = io.BytesIO(raw)
        result = md.convert_stream(stream, file_extension=ext)
        markdown_text = result.text_content or ""
    except Exception as exc:
        logger.error(f"MarkItDown conversion failed for '{filename}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Falha ao converter o arquivo: {exc}",
        )

    return ConvertResponse(
        markdown=markdown_text,
        filename=filename,
        detected_format=SUPPORTED_EXTENSIONS[ext],
        char_count=len(markdown_text),
    )


@router.post("/url", response_model=UrlConvertResponse)
async def convert_url(body: UrlConvertRequest):
    """
    Fetch a URL and convert its HTML content to Markdown.
    Useful for capturing documentation, articles, and references.
    """
    url = body.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL inválida. Use http:// ou https://",
        )

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=20.0,
            headers={"User-Agent": "PromptVault/1.0 (content-converter)"},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Tempo esgotado ao buscar a URL. Tente novamente.",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"A URL retornou erro {exc.response.status_code}.",
        )
    except Exception as exc:
        logger.error(f"URL fetch failed for '{url}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao buscar a URL: {exc}",
        )

    content_type = response.headers.get("content-type", "")
    html = response.text

    markdown_text, title = _html_to_markdown(html, base_url=url)

    if not markdown_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Não foi possível extrair conteúdo desta URL.",
        )

    return UrlConvertResponse(
        markdown=markdown_text,
        url=url,
        title=title or None,
        char_count=len(markdown_text),
    )


@router.post("/youtube", response_model=YoutubeConvertResponse)
async def convert_youtube(body: YoutubeConvertRequest):
    """
    Extract transcript from a YouTube video and convert to structured Markdown.
    No API key required. Supports auto-generated and manual captions.
    """
    video_id = _extract_youtube_id(body.url.strip())
    if not video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL do YouTube inválida. Use um link no formato youtube.com/watch?v=... ou youtu.be/...",
        )

    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Biblioteca youtube-transcript-api não instalada. Execute: pip install youtube-transcript-api",
        )

    try:
        languages = [body.language, "pt", "pt-BR", "en", "en-US"]
        seen = []
        for lang in languages:
            if lang not in seen:
                seen.append(lang)

        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=seen)
    except Exception:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        except Exception as exc:
            err_msg = str(exc)
            if "disabled" in err_msg.lower() or "TranscriptsDisabled" in err_msg:
                detail = "As legendas estão desativadas para este vídeo."
            elif "NoTranscriptFound" in err_msg or "no transcript" in err_msg.lower():
                detail = "Nenhuma transcrição disponível para este vídeo."
            else:
                detail = f"Falha ao obter transcrição: {err_msg}"
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=detail,
            )

    video_url = f"https://www.youtube.com/watch?v={video_id}"

    lines = [f"# Transcrição: {video_url}\n"]

    if body.include_timestamps:
        for entry in transcript_list:
            start = int(entry["start"])
            mins, secs = divmod(start, 60)
            hours, mins = divmod(mins, 60)
            if hours:
                ts = f"{hours:02d}:{mins:02d}:{secs:02d}"
            else:
                ts = f"{mins:02d}:{secs:02d}"
            lines.append(f"**[{ts}]** {entry['text']}")
    else:
        # Group into paragraphs (~10 entries each)
        chunk_size = 10
        chunks = [transcript_list[i:i + chunk_size] for i in range(0, len(transcript_list), chunk_size)]
        for chunk in chunks:
            paragraph = " ".join(entry["text"] for entry in chunk)
            lines.append(paragraph)
            lines.append("")

    markdown_text = "\n".join(lines).strip()

    return YoutubeConvertResponse(
        markdown=markdown_text,
        video_id=video_id,
        url=video_url,
        char_count=len(markdown_text),
    )


@router.get("/formats")
def list_formats():
    """Return the list of supported file formats."""
    return {
        "formats": [
            {"extension": ext, "label": label}
            for ext, label in SUPPORTED_EXTENSIONS.items()
        ],
        "max_size_mb": MAX_FILE_SIZE // (1024 * 1024),
    }
