"""
Inference utilities for the phishing email detection model.

Intentionally framework-agnostic — no FastAPI imports.
The FastAPI route layer should call predict_email() directly.
"""

from .model_loader import load_model


def predict_email(subject: str, body: str) -> float:
    """
    Return the probability that an email is phishing.

    Args:
        subject: Email subject line.
        body:    Email body text.

    Returns:
        Float in [0.0, 1.0] — probability of phishing.
        Example: 0.93 indicates high phishing likelihood.
    """
    model, vectorizer = load_model()

    text = (subject or "") + " " + (body or "")
    vec = vectorizer.transform([text])
    prob: float = model.predict_proba(vec)[0][1]
    return round(float(prob), 4)
