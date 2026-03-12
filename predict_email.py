import joblib
import re

# Load model and vectorizer
model = joblib.load("model/phishing_model.pkl")
vectorizer = joblib.load("model/vectorizer.pkl")

print("\nAI Phishing Detection System\n")

subject = input("Enter Email Subject: ")
body = input("\nEnter Email Body: ")

email_text = (subject + " " + body)

# Transform Text
email_vec = vectorizer.transform([email_text])

# Predict Probability
prob = model.predict_proba(email_vec)[0][1]

risk = round(prob * 100, 2)

print("\n\n---------------\n")
print(f"Phishing Risk: {risk}%\n")

# Indicator detection
indicators = []

urgent_words = ["urgent","verify","account","password",
    "click","login","confirm","suspend"
    ]

if any(word in email_text.lower() for word in urgent_words):
    indicators.append("Suspicious Language Detected")

urls = len(re.findall(r"http[s]?://", email_text))

if urls > 0:
    indicators.append(f"{urls} URL(s) Detected")

if "password" in email_text.lower():
    indicators.append("Password Mentioned")


if len(indicators) == 0:
    indicators.append("No Phishing Indicators Detected")

print("Phishing Indicators:\n")

for i in indicators:
    print(f"- {i}")

print("\n---------------")