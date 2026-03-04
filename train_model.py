import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

# Load the dataset
df = pd.read_csv("phishing_email_dataset.csv")

# Spearate features and lables
X = df.drop("label", axis=1)
y = df["label"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
 )

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

# Train model
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(
    n_estimators=100,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

print("Random Forest training completed.")

# Predict
predictions =model.predict(X_test)

# Evaluate
print("\nClassification Report:\n")
print(classification_report(y_test, predictions))

print("\nConfusion Matrix:\n")
print(confusion_matrix(y_test, predictions))

# Feature importance
feature_importance = pd.DataFrame({
    "feature": X.columns,
    "importance": model.feature_importances_
})

feature_importance = feature_importance.sort_values(
    by="importance",
    ascending=False
)

print("\nFeature Importance:\n")
print(feature_importance)

# Predict probabilities
probs = model.predict_proba(X_test)[:,1]

import numpy as np

# Try different thresholds
threshold = 0.4 # Adjust this threshold based on your needs

custom_predictions = (probs > threshold).astype(int)

print("\nCustom Threshold:", threshold)
print(classification_report(y_test, custom_predictions))
print("\nConfusionm Matrix:")
print(confusion_matrix(y_test, custom_predictions))