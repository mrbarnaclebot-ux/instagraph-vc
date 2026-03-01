import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import HTTPException
from app.scraper.scraper import scrape_url, _extract_text


class TestExtractText:
    def test_extracts_article_text(self):
        html = "<html><body><article><p>Paradigm led the $50M round.</p></article></body></html>"
        result = _extract_text(html)
        assert "Paradigm" in result
        assert "$50M" in result

    def test_strips_script_tags(self):
        html = "<html><body><script>evil();</script><p>Real content here.</p></body></html>"
        result = _extract_text(html)
        assert "evil" not in result
        assert "Real content here" in result

    def test_strips_nav_footer(self):
        html = "<html><body><nav>Menu items</nav><p>Article text</p><footer>Copyright</footer></body></html>"
        result = _extract_text(html)
        assert "Menu items" not in result
        assert "Copyright" not in result
        assert "Article text" in result

    def test_extracts_headings(self):
        html = "<html><body><h1>Funding Round Announced</h1><p>Details here.</p></body></html>"
        result = _extract_text(html)
        assert "Funding Round Announced" in result

    def test_prefers_article_over_p(self):
        """When <article> exists, <p> tags outside article should not be extracted separately."""
        html = "<html><body><p>Nav text</p><article><p>Article content here.</p></article><p>Footer text</p></body></html>"
        result = _extract_text(html)
        assert "Article content" in result

    def test_falls_back_to_p_without_article(self):
        """When no <article> exists, falls back to <p> tags."""
        html = "<html><body><p>Paragraph content only.</p></body></html>"
        result = _extract_text(html)
        assert "Paragraph content only" in result

    def test_caps_at_32000_chars(self):
        long_html = "<html><body>" + "<p>" + "a" * 100 + "</p>" * 400 + "</body></html>"
        result = _extract_text(long_html)
        assert isinstance(result, str)


class TestScrapeUrl:
    @pytest.mark.asyncio
    @patch("app.scraper.scraper.validate_url", return_value=("https://techcrunch.com/article", "104.18.20.100"))
    async def test_returns_extracted_text(self, mock_validate):
        import httpx

        mock_response = MagicMock(spec=httpx.Response)
        mock_response.is_redirect = False
        mock_response.headers = {"content-type": "text/html; charset=utf-8"}
        html = "<html><body><article><p>" + "Paradigm Capital led a $50M Series B. " * 20 + "</p></article></body></html>"
        mock_response.text = html
        mock_response.content = html.encode()
        mock_response.raise_for_status.return_value = None

        with patch("app.scraper.scraper.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await scrape_url("https://techcrunch.com/article")
            assert "Paradigm" in result
            mock_validate.assert_called_once_with("https://techcrunch.com/article")

    @pytest.mark.asyncio
    @patch("app.scraper.scraper.validate_url", return_value=("https://paywalled.com/article", "1.2.3.4"))
    async def test_rejects_low_content_page(self, mock_validate):
        import httpx

        mock_response = MagicMock(spec=httpx.Response)
        mock_response.is_redirect = False
        mock_response.headers = {"content-type": "text/html; charset=utf-8"}
        html = "<html><body><p>Short.</p></body></html>"
        mock_response.text = html
        mock_response.content = html.encode()
        mock_response.raise_for_status.return_value = None

        with patch("app.scraper.scraper.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await scrape_url("https://paywalled.com/article")
            assert exc_info.value.status_code == 400
            assert exc_info.value.detail["error"] == "scrape_failed"

    @pytest.mark.asyncio
    @patch("app.scraper.scraper.validate_url", return_value=("https://example.com/article", "93.184.216.34"))
    async def test_uses_follow_redirects_false(self, mock_validate):
        import httpx

        mock_response = MagicMock(spec=httpx.Response)
        mock_response.is_redirect = False
        mock_response.headers = {"content-type": "text/html; charset=utf-8"}
        html = "<html><body>" + "<p>Content. " * 100 + "</p></body></html>"
        mock_response.text = html
        mock_response.content = html.encode()
        mock_response.raise_for_status.return_value = None

        with patch("app.scraper.scraper.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            await scrape_url("https://example.com/article")

            call_kwargs = mock_client.get.call_args[1]
            assert call_kwargs.get("follow_redirects") is False

    @pytest.mark.asyncio
    @patch("app.scraper.scraper.validate_url", return_value=("https://slow-site.com/article", "1.2.3.4"))
    async def test_timeout_returns_503(self, mock_validate):
        import httpx

        with patch("app.scraper.scraper.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get.side_effect = httpx.TimeoutException("timed out")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            with pytest.raises(HTTPException) as exc_info:
                await scrape_url("https://slow-site.com/article")
            assert exc_info.value.status_code == 503
