import ipaddress
import re
from typing import List, Dict, Any
from urllib.parse import urlparse

# Common URL shorteners often abused
SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co", "is.gd", "cutt.ly"}
MAX_URLS_PER_TEXT = 25
MAX_URL_LENGTH = 2048
URL_PATTERN = re.compile(r"https?://[^\s<>'\"]{1,4096}", re.IGNORECASE)


def _is_ip_address(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False

def extract_urls(text: str) -> List[str]:
    "Extract all HTTP/HTTPS URLs fron email"
    urls = []
    for match in URL_PATTERN.finditer(text):
        urls.append(match.group(0))
        if len(urls) >= MAX_URLS_PER_TEXT:
            break
    return urls

def analyze_urls(text: str) -> List[Dict[str, Any]]:
    "Find URLs in text and runs heuristic checks to flag potentially malicious ones"
    urls = extract_urls(text)
    url_intelligence = []

    for url in urls:
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or ""
            hostname_lower = hostname.lower()
            is_ip_address = _is_ip_address(hostname)
            flags = []

            if len(url) > MAX_URL_LENGTH:
                flags.append("URL length exceeds safe threshold")

            # Check for IP address instead of domain name
            if is_ip_address:
                flags.append("IP address instead of domain")

            # Check for URL shorteners
            if hostname_lower in SHORTENERS:
                flags.append("URL shortener")

            # Check for excessive subdomains on real hostnames only.
            if not is_ip_address and len(hostname.split(".")) > 3:
                flags.append("Excessive subdomains")

            # Unencrypted HTTP
            if parsed.scheme == "http":
                flags.append("Unencrypted HTTP")

            url_intelligence.append({
                "url": url,
                "is_suspicious": len(flags) > 0,
                "flags": flags
            })
        except Exception:
            # If URL fails to parse, skip or flag as suspicious
            continue
    return url_intelligence