import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata endpoint
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA (unique local)
    ipaddress.ip_network("100.64.0.0/10"),     # Shared address space (RFC 6598)
]


def validate_url(url: str) -> str:
    """
    Validates a URL against SSRF attack vectors (SEC-01).
    Returns url unchanged if valid, raises HTTPException(400) otherwise.

    DNS rebinding protection: hostname is resolved once here.
    The caller (scraper.py) must use allow_redirects=False and
    re-validate any redirect targets through this function.
    """
    parsed = urlparse(url)

    if parsed.scheme != "https":
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Only HTTPS URLs are accepted",
        })

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Could not parse hostname from URL",
        })

    try:
        resolved_ip = socket.gethostbyname(hostname)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Could not resolve hostname",
        })

    try:
        ip_obj = ipaddress.ip_address(resolved_ip)
    except ValueError:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "Invalid IP address resolved from hostname",
        })

    # Block private/loopback/link-local ranges
    for network in BLOCKED_NETWORKS:
        if ip_obj in network:
            raise HTTPException(status_code=400, detail={
                "error": "invalid_url",
                "message": "URL resolves to a blocked address",
            })

    # Catch-all: block non-global addresses not covered by explicit ranges
    if not ip_obj.is_global:
        raise HTTPException(status_code=400, detail={
            "error": "invalid_url",
            "message": "URL resolves to a non-public address",
        })

    return url


def validate_input_length(text: str) -> str:
    """
    Rejects inputs shorter than 200 characters (AI-04).
    Returns text unchanged if valid, raises HTTPException(400) otherwise.
    """
    if len(text) < 200:
        raise HTTPException(status_code=400, detail={
            "error": "input_too_short",
            "message": "Input too short — paste a full funding announcement or article for best results",
        })
    return text
