# Step 1: Dataset
import pandas as pd

# Create small dataset
data = {"email_text": [
        "urgent verify your password",
        "meeting tomorrow at 10am",
        "click this link to claim prize",
        "project update attached",
        "your account has been suspended",
        "let's schedule a call"
    ],
    "label": [1, 0, 1, 0, 1, 0] # 1 for phishing, 0 for legitimate
}

df = pd.DataFrame(data)

print (df)

# Step 2: Split Data
from sklearn.model_selection import train_test_split
X = df ["email_text"] # Features
y = df ["label"] # Target variable/labels

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size = 0.33, random_state = 42
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# Step 3: Text to Numbers
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer()

X_train_vectorized = vectorizer.fit_transform(X_train)
X_test_vectorized = vectorizer.transform(X_test)

print("Number of features:", X_train_vectorized.shape[1])

# Step 4: Train Logistic Regression Model
from sklearn.linear_model import LogisticRegression

model = LogisticRegression()

model.fit(X_train_vectorized, y_train)

print("Model training completed.")

# Step 5: Make Predictions
predictions = model.predict(X_test_vectorized)

print("Predictions:", predictions)
print("Actual:", list(y_test))

# Step 6: Evaluate Properly
from sklearn.metrics import classification_report

print(classification_report(y_test, predictions))

# Step 7: Predict New Email (Real use case)
new_email = ["Please verify your account immediately"]

new_email_vectorized = vectorizer.transform(new_email)

prediction = model.predict(new_email_vectorized)
probability = model.predict_proba(new_email_vectorized)

print("Prediction for new email:", prediction[0])
print("Probability of being phishing:", probability[0][1])