import pytest
from unittest.mock import patch
from fastapi import HTTPException
from app.scraper.ssrf import validate_url, validate_input_length


class TestValidateUrl:
    def test_rejects_http_scheme(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("http://example.com/path")
        assert exc_info.value.status_code == 400

    def test_rejects_ftp_scheme(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("ftp://example.com/file")
        assert exc_info.value.status_code == 400

    def test_rejects_empty_hostname(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="127.0.0.1")
    def test_rejects_loopback_ip(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="10.0.0.1")
    def test_rejects_rfc1918_10_block(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="10.255.255.255")
    def test_rejects_rfc1918_10_block_upper(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="172.16.0.1")
    def test_rejects_rfc1918_172_block(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="192.168.1.1")
    def test_rejects_rfc1918_192_block(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="169.254.169.254")
    def test_rejects_aws_metadata_endpoint(self, mock_dns):
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://evil.com/path")
        assert exc_info.value.status_code == 400

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="93.184.216.34")
    def test_accepts_valid_public_url(self, mock_dns):
        result = validate_url("https://example.com/article")
        assert result == "https://example.com/article"

    @patch("app.scraper.ssrf.socket.gethostbyname", return_value="104.18.20.100")
    def test_accepts_techcrunch_url(self, mock_dns):
        result = validate_url("https://techcrunch.com/2024/01/01/funding")
        assert result == "https://techcrunch.com/2024/01/01/funding"


class TestValidateInputLength:
    def test_rejects_short_text(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_input_length("short text")
        assert exc_info.value.status_code == 400
        assert exc_info.value.detail["error"] == "input_too_short"
        assert "Input too short" in exc_info.value.detail["message"]
        assert "paste a full funding announcement" in exc_info.value.detail["message"]

    def test_rejects_199_chars(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_input_length("a" * 199)
        assert exc_info.value.status_code == 400

    def test_accepts_200_chars(self):
        result = validate_input_length("a" * 200)
        assert result == "a" * 200

    def test_accepts_long_text(self):
        long_text = "a" * 1000
        result = validate_input_length(long_text)
        assert result == long_text

    def test_exact_error_message(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_input_length("too short")
        expected = "Input too short \u2014 paste a full funding announcement or article for best results"
        assert exc_info.value.detail["message"] == expected
