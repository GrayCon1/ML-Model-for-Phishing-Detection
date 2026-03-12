"""
Training pipeline for the phishing email detection model.

Loads phishing_email_content.csv, engineers features via TF-IDF on the
combined subject+body text, trains a Logistic Regression classifier, and
saves the model and vectorizer artifacts to backend/model/.
"""

import os
import pathlib

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DATASET_PATH = REPO_ROOT / "phishing_email_content.csv"
MODEL_DIR = REPO_ROOT / "backend" / "model"
MODEL_PATH = MODEL_DIR / "phishing_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"


def load_data(path: pathlib.Path) -> pd.DataFrame:
    df = pd.read_csv(path)

    # Fill missing subjects so concatenation is safe
    df["subject"] = df["subject"].fillna("")
    df["body"] = df["body"].fillna("")

    df["text"] = df["subject"] + " " + df["body"]
    return df


def build_pipeline(df: pd.DataFrame):
    X = df["text"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        max_features=10_000,
        sublinear_tf=True,      # log-scale TF dampens very frequent terms
        strip_accents="unicode",
        analyzer="word",
        ngram_range=(1, 2),     # unigrams + bigrams improve phishing pattern recall
        min_df=2,
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(
        max_iter=1000,
        C=1.0,
        solver="lbfgs",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_vec, y_train)

    return model, vectorizer, X_test_vec, y_test


def evaluate(model, X_test_vec, y_test) -> None:
    predictions = model.predict(X_test_vec)

    print("\n=== Classification Report ===")
    print(classification_report(y_test, predictions, target_names=["Legitimate", "Phishing"]))

    print("=== Confusion Matrix ===")
    cm = confusion_matrix(y_test, predictions)
    print(f"{'':20s} Predicted Legit  Predicted Phish")
    print(f"{'Actual Legit':20s} {cm[0][0]:<17} {cm[0][1]}")
    print(f"{'Actual Phish':20s} {cm[1][0]:<17} {cm[1][1]}")


def save_artifacts(model, vectorizer) -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"\nModel saved    -> {MODEL_PATH}")
    print(f"Vectorizer saved -> {VECTORIZER_PATH}")


def main() -> None:
    print(f"Loading dataset from: {DATASET_PATH}")
    df = load_data(DATASET_PATH)
    print(f"Dataset loaded: {len(df):,} rows | label distribution:\n{df['label'].value_counts().to_string()}")

    print("\nBuilding TF-IDF features and training Logistic Regression...")
    model, vectorizer, X_test_vec, y_test = build_pipeline(df)
    print("Training complete.")

    evaluate(model, X_test_vec, y_test)
    save_artifacts(model, vectorizer)


if __name__ == "__main__":
    main()
