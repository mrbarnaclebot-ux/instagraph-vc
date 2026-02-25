import requests
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


def scrape_url(url: str) -> str:
    """
    Fetches a public HTTPS URL, strips boilerplate HTML, and returns
    extracted text (up to 32,000 chars) for GPT-4o processing (AI-02).

    SSRF protection (SEC-01):
    - validate_url() is called first — raises 400 if URL is private/blocked
    - allow_redirects=False prevents redirect chains to private IPs
    - Redirect Location headers are validated through validate_url() before following

    Source type handling (AI-03):
    - This function is ONLY called when input is a URL (source_type="url")
    - Raw text input bypasses this function entirely (handled in generate/service.py)

    Redis caching (AI-02 partial):
    - URL caching ("cache raw scraped text for 1 hour") is NOT implemented here.
    - That sub-requirement is delivered in Phase 4 with RATE-03 (Upstash Redis).
    - The caller (generate/service.py) will be updated in Phase 4 to check cache
      before calling scrape_url().

    Raises:
        HTTPException(400): URL is private/blocked (from validate_url)
        HTTPException(400): Fetched content is too short (paywalled/empty page)
        HTTPException(400): HTTP error (4xx, 5xx from target site)
        HTTPException(503): Network timeout or connection error
    """
    # SSRF guard — resolves hostname and validates IP before any network request
    validate_url(url)

    try:
        response = requests.get(
            url,
            headers={"User-Agent": CHROME_UA},
            timeout=10,          # 10s timeout — fail fast per CONTEXT.md
            allow_redirects=False,  # CRITICAL: validate redirects manually (SEC-01)
        )

        # Handle redirects manually to validate each redirect target
        redirect_count = 0
        while response.is_redirect and redirect_count < 5:
            redirect_url = response.headers.get("Location", "")
            if not redirect_url.startswith("http"):
                # Relative redirect — reconstruct absolute URL
                from urllib.parse import urljoin
                redirect_url = urljoin(url, redirect_url)
            # Validate the redirect target through SSRF guard
            validate_url(redirect_url)
            response = requests.get(
                redirect_url,
                headers={"User-Agent": CHROME_UA},
                timeout=10,
                allow_redirects=False,
            )
            redirect_count += 1

        response.raise_for_status()

    except requests.Timeout:
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "URL fetch timed out — try again or paste the text directly",
        })
    except requests.ConnectionError:
        raise HTTPException(status_code=503, detail={
            "error": "service_unavailable",
            "message": "Could not connect to URL — try pasting the text instead",
        })
    except requests.HTTPError as e:
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
    Extracts: h1/h2/h3 headings, <article> body, <p> paragraphs.
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
    # Article body (many news sites wrap content in <article>)
    for article in soup.find_all("article"):
        text = article.get_text(separator=" ", strip=True)
        if text:
            parts.append(text)
    # Paragraph fallback (catches sites without <article>)
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        if text:
            parts.append(text)

    return " ".join(parts)
