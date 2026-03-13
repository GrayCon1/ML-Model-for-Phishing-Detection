"""
Model loading utilities for phishing email inference.
"""

import hashlib
import hmac
import os
import pathlib
from functools import lru_cache
from typing import Any, Tuple

import joblib

MODEL_DIR = pathlib.Path(__file__).resolve().parents[1] / "model"
MODEL_PATH = MODEL_DIR / "phishing_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"
MODEL_HASH_PATH = MODEL_DIR / "phishing_model.pkl.sha256"
VECTORIZER_HASH_PATH = MODEL_DIR / "vectorizer.pkl.sha256"
MODEL_HASH_ENV = "PHISHING_MODEL_SHA256"
VECTORIZER_HASH_ENV = "PHISHING_VECTORIZER_SHA256"


def _compute_sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_expected_hash(hash_path: pathlib.Path, env_var_name: str) -> str:
    env_value = os.environ.get(env_var_name, "").strip().lower()
    if env_value:
        return env_value

    if not hash_path.exists():
        raise RuntimeError(
            f"Missing hash manifest for {hash_path.name}. "
            f"Set {env_var_name} or create {hash_path.name}."
        )

    return hash_path.read_text(encoding="utf-8").strip().split()[0].lower()


def _verify_artifact(path: pathlib.Path, hash_path: pathlib.Path, env_var_name: str) -> None:
    expected_hash = _read_expected_hash(hash_path, env_var_name)
    actual_hash = _compute_sha256(path)

    if not hmac.compare_digest(actual_hash, expected_hash):
        raise RuntimeError(f"Integrity check failed for model artifact: {path.name}")


@lru_cache(maxsize=1)
def load_model() -> Tuple[Any, Any]:
    """
    Load and cache the trained model artifacts from disk.
    """
    _verify_artifact(MODEL_PATH, MODEL_HASH_PATH, MODEL_HASH_ENV)
    _verify_artifact(VECTORIZER_PATH, VECTORIZER_HASH_PATH, VECTORIZER_HASH_ENV)

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    return model, vectorizer


model, vectorizer = load_model()
