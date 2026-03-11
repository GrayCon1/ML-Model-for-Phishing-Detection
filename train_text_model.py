import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

# Load Dataset
df = pd.read_csv("phishing_email_content.csv")

# Combine Subject and body
df["text"] = df["subject"].fillna("") + " " + df["body"].fillna("")

X = df["text"]
y = df["label"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# Convert text -> Numerical vectors
vectorizer = TfidfVectorizer(
    stop_words="english",
    max_features=10000
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Train classifier
model = LogisticRegression(max_iter=1000)

model.fit(X_train_vec, y_train)

print("Text model training complete!")

# Predictions
predictions = model.predict(X_test_vec)

print("\nClassification Report:\n")
print(classification_report(y_test, predictions))

print("\nConfusion Matrix:\n")
print(confusion_matrix(y_test, predictions))