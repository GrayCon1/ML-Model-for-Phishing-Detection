import requests
import json

# This is the local address where Uvicorn is running
URL = "http://127.0.0.1:8000/analyze"

def run_test(subject, body):
    payload = {
        "subject": subject,
        "body": body
    }
    
    print(f"\n--- Testing: {subject} ---")
    try:
        response = requests.post(URL, json=payload)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Label: {result['label']}")
            print(f"📊 Risk Score: {result['phishing_risk']:.4f}")
            print(f"🔍 Top Signals: {', '.join(result['top_signals'][:5])}")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"⚠️ Connection Failed: {e}")

if __name__ == "__main__":
    # Test 1: High-risk phishing (using keywords found in your new dataset)
    run_test(
        "Urgent: Your account is suspended", 
        "Someone from a different IP tried to login. Click http://secure-verify.com to avoid being a loser."
    )
    
    # Test 2: Safe everyday email
    run_test(
        "Monday Lunch reminder", 
        "Hey Connor, are we still meeting at the cafe at 12? Let me know."
    )