"""
Model loading utilities for phishing email inference.
"""

import pathlib
from functools import lru_cache
from typing import Any, Tuple

import joblib

MODEL_DIR = pathlib.Path(__file__).resolve().parents[1] / "model"
MODEL_PATH = MODEL_DIR / "phishing_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"


@lru_cache(maxsize=1)
def load_model() -> Tuple[Any, Any]:
    """
    Load and cache the trained model artifacts from disk.
    """
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return model, vectorizer
