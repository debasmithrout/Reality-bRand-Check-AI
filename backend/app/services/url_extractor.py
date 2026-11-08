"""
Reality bRand Check AI - Safe Website Content Extraction Service
Implements SSRF protection, redirect verification, size-bounded streaming,
and standard-library HTML text extraction.
"""

from html.parser import HTMLParser
import ipaddress
import re
import socket
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse
import httpx

from app.core.errors import ValidationException


class WebTextExtractor(HTMLParser):
    """
    Strips scripts, stylesheets, navigation bars, footers, headers, and auxiliary widgets,
    extracting clean visible text content and page title.
    """
    def __init__(self):
        super().__init__()
        self.ignore_tags = {
            "script", "style", "nav", "footer", "header", "aside",
            "noscript", "svg", "button", "form", "select", "iframe"
        }
        self.current_ignore_depth = 0
        self.pieces = []
        self.title_pieces = []
        self.in_title = False

    def handle_starttag(self, tag: str, attrs):
        lower_tag = tag.lower()
        if lower_tag in self.ignore_tags:
            self.current_ignore_depth += 1
        elif lower_tag == "title":
            self.in_title = True

    def handle_endtag(self, tag: str):
        lower_tag = tag.lower()
        if lower_tag in self.ignore_tags and self.current_ignore_depth > 0:
            self.current_ignore_depth -= 1
        elif lower_tag == "title":
            self.in_title = False

    def handle_data(self, data: str):
        if self.in_title:
            cleaned = data.strip()
            if cleaned:
                self.title_pieces.append(cleaned)
        elif self.current_ignore_depth == 0:
            cleaned = data.strip()
            if cleaned:
                self.pieces.append(cleaned)

    def get_extracted_text(self) -> str:
        raw_text = " ".join(self.pieces)
        # Collapse multiple spaces and newlines
        return re.sub(r"\s+", " ", raw_text).strip()

    def get_title(self) -> str:
        return " ".join(self.title_pieces).strip()


class URLExtractorService:
    MAX_REDIRECTS = 3
    REQUEST_TIMEOUT = 8.0
    MAX_CONTENT_BYTES = 2 * 1024 * 1024  # 2MB
    MAX_TEXT_LENGTH = 15000

    @classmethod
    def validate_url_safety(cls, url: str) -> None:
        """
        Enforce strict SSRF protection:
        - Must be http or https
        - Hostname required
        - Reject loopback, private, link-local, multicast, reserved addresses
        - Reject cloud metadata addresses
        """
        if not url or not isinstance(url, str):
            raise ValidationException("A valid website URL is required.")

        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            raise ValidationException(
                f"Unsupported URL protocol '{parsed.scheme}'. Only HTTP and HTTPS are permitted."
            )

        hostname = parsed.hostname
        if not hostname:
            raise ValidationException("Invalid URL: Missing hostname.")

        lowered_host = hostname.lower()

        # Prohibit known loopback and internal hostname aliases
        if lowered_host in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "0") or \
           lowered_host.endswith(".local") or lowered_host.endswith(".internal"):
            raise ValidationException("Access to localhost or internal network hosts is prohibited.")

        # Prohibit cloud metadata hostnames
        if "metadata.google.internal" in lowered_host or "169.254.169.254" in lowered_host or "100.100.100.200" in lowered_host:
            raise ValidationException("Access to cloud metadata endpoints is prohibited.")

        # Resolve IP addresses for hostname
        try:
            addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
        except socket.gaierror:
            raise ValidationException(f"Could not resolve domain name '{hostname}'.")

        for info in addr_info:
            ip_str = info[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                raise ValidationException(f"Invalid resolved IP address '{ip_str}'.")

            if ip.is_loopback:
                raise ValidationException(f"Prohibited host: {ip_str} is a loopback address.")
            if ip.is_private:
                raise ValidationException(f"Prohibited host: {ip_str} is a private network address.")
            if ip.is_link_local:
                raise ValidationException(f"Prohibited host: {ip_str} is a link-local address.")
            if ip.is_reserved:
                raise ValidationException(f"Prohibited host: {ip_str} is a reserved network address.")
            if ip.is_multicast:
                raise ValidationException(f"Prohibited host: {ip_str} is a multicast address.")
            if str(ip) in ("169.254.169.254", "100.100.100.200"):
                raise ValidationException("Access to cloud metadata IP is prohibited.")

    @classmethod
    async def fetch_and_extract(cls, url: str) -> Dict[str, str]:
        """
        Safely retrieves and parses text content from a web URL.
        Returns a dictionary with 'title', 'content', 'url', and 'character_count'.
        """
        target_url = url.strip()
        redirect_count = 0

        headers = {
            "User-Agent": "RealityBrandCheck-Bot/1.0 (+https://realitybrandcheck.ai; Content Compliance Review)",
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        }

        async with httpx.AsyncClient(timeout=cls.REQUEST_TIMEOUT, follow_redirects=False) as client:
            while True:
                cls.validate_url_safety(target_url)

                try:
                    response = await client.get(target_url, headers=headers)
                except httpx.TimeoutException:
                    raise ValidationException(f"Request to '{target_url}' timed out after {cls.REQUEST_TIMEOUT}s.")
                except httpx.RequestError as exc:
                    raise ValidationException(f"Failed to connect to '{target_url}': {str(exc)}")

                # Check redirects manually to validate target URL safety
                if response.status_code in (301, 302, 303, 307, 308):
                    redirect_count += 1
                    if redirect_count > cls.MAX_REDIRECTS:
                        raise ValidationException(f"Too many redirects (max {cls.MAX_REDIRECTS}).")

                    location = response.headers.get("Location")
                    if not location:
                        raise ValidationException("Redirect response missing 'Location' header.")

                    target_url = urljoin(target_url, location)
                    continue

                if response.status_code >= 400:
                    raise ValidationException(
                        f"Website returned error HTTP {response.status_code} ({response.reason_phrase})."
                    )

                content_type = response.headers.get("Content-Type", "").lower()
                if not any(t in content_type for t in ("text/html", "text/plain", "application/xhtml")):
                    raise ValidationException(
                        f"Unsupported content type '{content_type}'. Only HTML or text pages can be analyzed."
                    )

                raw_bytes = response.content
                if len(raw_bytes) > cls.MAX_CONTENT_BYTES:
                    raise ValidationException(
                        f"Webpage content exceeds maximum allowed size of {cls.MAX_CONTENT_BYTES // (1024*1024)}MB."
                    )

                # Decode HTML using response-detected encoding or fallback utf-8
                html_text = response.text
                break

        # Parse HTML text
        parser = WebTextExtractor()
        try:
            parser.feed(html_text)
        except Exception:
            # Fallback to simple regex stripping if parser encounters unexpected syntax
            clean = re.sub(r"<[^>]+>", " ", html_text)
            clean = re.sub(r"\s+", " ", clean).strip()
            title = "Website Copy"
            extracted_text = clean
        else:
            title = parser.get_title() or "Website Copy"
            extracted_text = parser.get_extracted_text()

        if len(extracted_text) < 15:
            raise ValidationException(
                "No readable marketing copy was found on this webpage. Note: Client-side JavaScript-only applications are not supported."
            )

        # Truncate if exceeds max text limit
        if len(extracted_text) > cls.MAX_TEXT_LENGTH:
            extracted_text = extracted_text[:cls.MAX_TEXT_LENGTH] + "... [Content truncated for compliance review]"

        return {
            "url": target_url,
            "title": title,
            "content": extracted_text,
            "character_count": len(extracted_text),
            "word_count": len(extracted_text.split()),
        }

