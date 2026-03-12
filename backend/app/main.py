import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .indicators import detect_indicators
from .model_loader import load_model
from .predictor import predict_email

# Comma-separated list of allowed origins, e.g.
# ALLOWED_ORIGINS=https://my-app.vercel.app,https://staging.vercel.app
# Defaults to "*" for local development only.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: List[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]


class AnalyzeRequest(BaseModel):
    subject: str = Field(..., description="Email subject line")
    body: str = Field(..., description="Email body content")


class AnalyzeResponse(BaseModel):
    phishing_risk: float
    label: str
    indicators: List[str]


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
)

_wildcard = ALLOWED_ORIGINS == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # credentials (cookies/auth headers) require an explicit origin list,
    # not the wildcard — only enable when a real origin list is provided.
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_email(payload: AnalyzeRequest) -> AnalyzeResponse:
    phishing_risk = predict_email(payload.subject, payload.body)
    indicators = detect_indicators(payload.subject, payload.body)

    if phishing_risk < 0.5:
        label = "Likely Legitimate"
    else:
        label = "Likely Phishing"

    return AnalyzeResponse(
        phishing_risk=phishing_risk,
        label=label,
        indicators=indicators,
    )
