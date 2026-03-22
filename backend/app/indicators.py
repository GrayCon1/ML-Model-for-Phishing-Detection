import re
from typing import List

# This was the missing piece! 
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)

def detect_indicators(subject: str, body: str) -> List[str]:
    combined_text = f"{subject or ''} {body or ''}".strip()
    text_lower = combined_text.lower()
    indicators: List[str] = []

    # 1. Sense of Urgency
    urgency_words = ["urgent", "immediately", "action required", "suspended", "expire"]
    if any(word in text_lower for word in urgency_words):
        indicators.append("Strong sense of urgency detected")

    # 2. Credential Harvesting
    harvesting_words = ["password", "login", "credentials", "signin", "verify account"]
    if any(word in text_lower for word in harvesting_words):
        indicators.append("Potential credential harvesting attempt")

    # 3. Link Density
    links = URL_PATTERN.findall(combined_text)
    if len(links) > 2:
        indicators.append(f"High link density ({len(links)} links found)")

    return indicators

def get_rule_based_indicators(subject: str, body: str) -> List[str]:
    return detect_indicators(subject, body)