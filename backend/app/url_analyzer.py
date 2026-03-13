import ipaddress
import re
from typing import List, Dict, Any, Tuple
from urllib.parse import urlparse

# Common URL shorteners often abused
SHORTENERS = {"bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co", "is.gd", "cutt.ly"}
MAX_URLS_PER_TEXT = 25
MAX_URL_LENGTH = 2048

URL_PATTERN = re.compile(r"https?://[^\s<>'\"]{1,4096}", re.IGNORECASE)

# Matches bare domains like "passwordreset.uni.lu" or "evil.example.com/path".
# Requires at least two dot-separated labels so single words like "foo.bar" are
# less likely to produce false positives.  Negative lookbehind prevents matching
# the host portion of an already-captured https?:// URL or an email address.
BARE_DOMAIN_PATTERN = re.compile(
    r"(?<![/@\w])"
    r"(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.){1,}"
    r"[a-zA-Z]{2,6}"
    r"(?:/[^\s<>'\"]*)?"
    r"(?=[\s,;!?\"\'()\[\]]|$)",
    re.IGNORECASE,
)


def _is_ip_address(hostname: str) -> bool:
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def extract_urls(text: str) -> List[Tuple[str, bool]]:
    """Extract HTTP/HTTPS URLs and bare domain URLs from email text.

    Returns a list of (url, is_bare_domain) tuples.  Full https?:// URLs are
    returned first; bare domains that overlap with a full URL are skipped.
    """
    results: List[Tuple[str, bool]] = []
    full_url_spans: List[Tuple[int, int]] = []

    for match in URL_PATTERN.finditer(text):
        if len(results) >= MAX_URLS_PER_TEXT:
            break
        results.append((match.group(0), False))
        full_url_spans.append((match.start(), match.end()))

    for match in BARE_DOMAIN_PATTERN.finditer(text):
        if len(results) >= MAX_URLS_PER_TEXT:
            break
        start, end = match.start(), match.end()
        if any(start >= s and end <= e for s, e in full_url_spans):
            continue
        results.append((match.group(0), True))

    return results


def analyze_urls(text: str) -> List[Dict[str, Any]]:
    """Find URLs in text and run heuristic checks to flag potentially malicious ones."""
    url_entries = extract_urls(text)
    url_intelligence = []

    for raw_url, is_bare in url_entries:
        try:
            parse_target = f"https://{raw_url}" if is_bare else raw_url
            parsed = urlparse(parse_target)
            hostname = parsed.hostname or ""
            hostname_lower = hostname.lower()
            is_ip_address = _is_ip_address(hostname)
            flags = []

            if is_bare:
                flags.append("Missing HTTPS scheme")

            if len(raw_url) > MAX_URL_LENGTH:
                flags.append("URL length exceeds safe threshold")

            if is_ip_address:
                flags.append("IP address instead of domain")

            if hostname_lower in SHORTENERS:
                flags.append("URL shortener")

            if not is_ip_address and len(hostname.split(".")) > 3:
                flags.append("Excessive subdomains")

            if not is_bare and parsed.scheme == "http":
                flags.append("Unencrypted HTTP")

            url_intelligence.append({
                "url": raw_url,
                "is_suspicious": len(flags) > 0,
                "flags": flags,
            })
        except Exception:
            continue

    return url_intelligence