"""
Rule-based phishing indicators returned alongside model predictions.
"""

import re
from typing import List

SUSPICIOUS_KEYWORDS = (
    "urgent",
    "verify",
    "account",
    "password",
    "login",
    "confirm",
    "click",
    "suspend",
)
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)


def detect_indicators(subject: str, body: str) -> List[str]:
    """
    Extract simple phishing indicators from the email content.
    """
    combined_text = f"{subject or ''} {body or ''}".strip()
    text_lower = combined_text.lower()
    indicators: List[str] = []

    if any(keyword in text_lower for keyword in SUSPICIOUS_KEYWORDS):
        indicators.append("suspicious language detected")

    if len(URL_PATTERN.findall(combined_text)) > 0:
        indicators.append("multiple links detected")

    if "password" in text_lower or "login" in text_lower:
        indicators.append("credential harvesting attempt")

    return indicators


def get_rule_based_indicators(subject: str, body: str) -> List[str]:
    """
    Backward-compatible alias for the rule-based indicator pipeline.
    """
    return detect_indicators(subject, body)
