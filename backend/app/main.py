import os
import logging
from contextlib import asynccontextmanager
from typing import List
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .explainer import explain_prediction
from .indicators import get_rule_based_indicators
from .model_loader import load_model, model, vectorizer
from .predictor import predict_phishing
from .url_analyzer import analyze_urls

logger = logging.getLogger(__name__)

MAX_SUBJECT_LENGTH = 255
MAX_BODY_LENGTH = 10_000
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


def _parse_allowed_origins() -> List[str]:
    raw_origins = os.environ.get("ALLOWED_ORIGINS")
    origins = (
        [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        if raw_origins
        else list(DEFAULT_ALLOWED_ORIGINS)
    )

    if not origins:
        raise RuntimeError("At least one allowed frontend origin must be configured.")

    if "*" in origins:
        raise RuntimeError("Wildcard CORS origins are not allowed.")

    for origin in origins:
        parsed = urlparse(origin)
        if parsed.scheme not in {"http", "https","chrome-extension"} or not parsed.netloc:
            raise RuntimeError(f"Invalid CORS origin configured: {origin}")

    return origins


ALLOWED_ORIGINS = _parse_allowed_origins()


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    subject: str = Field(
        ...,
        min_length=1,
        max_length=MAX_SUBJECT_LENGTH,
        description="Email subject line",
    )
    body: str = Field(
        ...,
        min_length=1,
        max_length=MAX_BODY_LENGTH,
        description="Email body content",
    )


class URLAnalysis(BaseModel):
    url: str
    is_suspicious: bool
    flags: List[str]


class AnalyzeResponse(BaseModel):
    phishing_risk: float
    label: str
    indicators: List[str]
    top_signals: List[str]
    url_intelligence: List[URLAnalysis]


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Warm the cached model at startup so the first request is fast.
    load_model()
    yield


app = FastAPI(
    title="Phishing Detection API",
    description="API for scoring phishing risk from email subject and body text.",
    version="1.0.0",
    lifespan=lifespan,
    debug=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(
        "Unhandled server error while processing %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_email(payload: AnalyzeRequest) -> AnalyzeResponse:
    combined_text = f"{payload.subject} {payload.body}"
    phishing_risk = predict_phishing(combined_text, model, vectorizer)
    label = "Likely Phishing" if phishing_risk >= 0.5 else "Likely Legitimate"
    indicators = get_rule_based_indicators(payload.subject, payload.body)
    top_signals = explain_prediction(combined_text, model, vectorizer)
    url_intelligence = analyze_urls(combined_text)

    return AnalyzeResponse(
        phishing_risk=phishing_risk,
        label=label,
        indicators=indicators,
        top_signals=top_signals,
        url_intelligence=url_intelligence,
    )
