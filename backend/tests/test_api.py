import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.indicators import detect_indicators

# This creates a "fake" browser to test your API
client = TestClient(app)

def test_heuristic_indicators():
    """Test that the rule-based engine catches phishing keywords."""
    subject = "Urgent: Account Suspended"
    body = "Click here to login and verify your password immediately."
    
    indicators = detect_indicators(subject, body)
    
    # We assert (expect) that these specific strings are in the result
    assert "Strong sense of urgency detected" in indicators
    assert "Potential credential harvesting attempt" in indicators

def test_analyze_endpoint_safe_email():
    """Test that the ML model correctly identifies a safe email."""
    payload = {
        "subject": "Monday Lunch",
        "body": "Hey team, let's meet at Cattle Barron at 12pm. See you there!"
    }
    
    response = client.post("/analyze", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # The risk should be very low, and the label should be Legitimate
    assert data["phishing_risk"] < 0.5
    assert data["label"] == "Likely Legitimate"
    assert len(data["url_intelligence"]) == 0 # No URLs were sent