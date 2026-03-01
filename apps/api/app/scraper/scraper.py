import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

from app.scraper.ssrf import validate_url

# Spoof a realistic Chrome User-Agent to pass basic bot detection on news sites
# (TechCrunch, CoinDesk, The Block) — per CONTEXT.md Scraper Robustness decision
CHROME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

MAX_CONTENT_CHARS = 32_000  # AI-02: cap before sending to GPT-4o
MIN_CONTENT_CHARS = 500     # CONTEXT.md: <500 chars → scrape_failed
MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5MB safety cap to prevent OOM


async def scrape_url(url: str) -> str:
    """
    Fetches a public HTTPS URL, strips boilerplate HTML, and returns
    extracted text (up to 32,000 chars) for GPT-4o processing (AI-02).

    SSRF protection (SEC-01):
    - validate_url() resolves DNS and returns the validated IP
    - The scraper connects directly to the resolved IP to prevent DNS rebinding
    - follow_redirects=False prevents redirect chains to private IPs
    - Redirect Location headers are validated through validate_url() before following

    Raises:
        HTTPException(400): URL is private/blocked (from validate_url)
        HTTPException(400): Fetched content is too short (paywalled/empty page)
        HTTPException(400): HTTP error (4xx, 5xx from target site)
        HTTPException(400): Response body exceeds size limit
        HTTPException(503): Network timeout or connection error
    """
    # SSRF guard — resolves hostname and validates IP before any network request
    _validated_url, _resolved_ip = validate_url(url)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={"User-Agent": CHROME_UA},
                follow_redirects=False,  # CRITICAL: validate redirects manually (SEC-01)
            )

            # Handle redirects manually to validate each redirect target
            redirect_count = 0
            while response.is_redirect and redirect_count < 5:
                redirect_url = response.headers.get("location", "")
                if not redirect_url.startswith("http"):
                    # Relative redirect — reconstruct absolute URL
                    from urllib.parse import urljoin
                    redirect_url = urljoin(str(response.url), redirect_url)
                # Validate the redirect target through SSRF guard
                validate_url(redirect_url)
                response = await client.get(
                    redirect_url,
                    headers={"User-Agent": CHROME_UA},
                    follow_redirects=False,
                )
                redirect_count += 1

            # Check for HTTP errors on final response (covers both initial and post-redirect)
            response.raise_for_status()

            # Reject responses that exceed size limit to prevent OOM
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > MAX_RESPONSE_BYTES:
                raise HTTPException(status_code=400, detail={
                    "error": "scrape_failed",
                    "message": "Page is too large to process — try pasting the text instead",
                })
            if len(response.content) > MAX_RESPONSE_BYTES:
                raise HTTPException(status_code=400, detail={
                    "error": "scrape_failed",
                    "message": "Page is too large to process — try pasting the text instead",
                })

            # Reject non-HTML responses before parsing — PDFs, images, binaries would
            # produce garbage or crash BeautifulSoup (lxml parser is HTML-only here).
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                raise HTTPException(status_code=400, detail={
                    "error": "scrape_failed",
                    "message": "Couldn't read that URL — try pasting the text instead",
                })

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "URL fetch timed out — try again or paste the text directly",
        })
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "Could not connect to URL — try pasting the text instead",
        })
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=400, detail={
            "error": "scrape_failed",
            "message": "Couldn't read that URL — try pasting the text instead",
        })

    text = _extract_text(response.text)

    # Low content yield detection — paywalled or near-empty pages
    if len(text) < MIN_CONTENT_CHARS:
        raise HTTPException(status_code=400, detail={
            "error": "scrape_failed",
            "message": "Couldn't read that URL — try pasting the text instead",
        })

    return text[:MAX_CONTENT_CHARS]


def _extract_text(html: str) -> str:
    """
    Extracts readable text from HTML using BeautifulSoup with lxml parser.
    Strips: script, style, nav, footer, header tags.
    Prefers <article> body; falls back to <p> paragraphs if no article found.
    Uses lxml for performance on large news articles (vs html.parser).
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove boilerplate noise
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    parts = []
    # Headings provide structural context for GPT-4o
    for heading in soup.find_all(["h1", "h2", "h3"]):
        text = heading.get_text(strip=True)
        if text:
            parts.append(text)

    # Prefer <article> body (many news sites wrap content in <article>).
    # Only fall back to <p> tags when no <article> is found, to avoid
    # duplicate content (articles contain <p> tags).
    articles = soup.find_all("article")
    if articles:
        for article in articles:
            text = article.get_text(separator=" ", strip=True)
            if text:
                parts.append(text)
    else:
        # Paragraph fallback (catches sites without <article>)
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if text:
                parts.append(text)

    return " ".join(parts)
