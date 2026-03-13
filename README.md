# AI Phishing Detection System

A machine-learning system that scores the phishing risk of an email from its subject and body. It uses a TF-IDF + Logistic Regression pipeline served through a FastAPI backend and a React frontend.

<img src="images/python.jpeg" alt="Python" height="40">&nbsp;&nbsp;<img src="images/fastapi.png" alt="FastAPI" height="40">&nbsp;&nbsp;<img src="images/scikit-learn.jpg" alt="scikit-learn" height="40">&nbsp;&nbsp;<img src="images/react.png" alt="React" height="40">&nbsp;&nbsp;<img src="images/docker.png" alt="Docker" height="40">

---

## Table of Contents

- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Dataset](#dataset)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables-reference)
- [Tech Stack](#tech-stack)

---

## Screenshots

### Main Dashboard

> Submit an email subject and body to begin a threat assessment.

<!-- Replace with actual screenshot -->

![Main Dashboard](docs/screenshots/dashboard-empty.png)

### High-Risk Result

> The panel displays a phishing risk score, flagged indicators, top model signals, and URL intelligence.

<!-- Replace with actual screenshot -->

![High Risk Result](docs/screenshots/result-high-risk.png)

### Low-Risk Result

<!-- Replace with actual screenshot -->

![Low Risk Result](docs/screenshots/result-low-risk.png)

> **Adding screenshots:** Run the app locally, take a screenshot of each state, and save them to `docs/screenshots/` using the filenames above.

---

## How It Works

```
Email Subject + Body
        │
        ▼
 TF-IDF Vectorizer        ← transforms raw text into numeric feature vectors
        │
        ▼
 Logistic Regression      ← outputs a phishing probability score (0.0 → 1.0)
        │
        ▼
 Rule-Based Indicators    ← regex/heuristic checks (URLs, urgency phrases, etc.)
        │
        ▼
 FastAPI /analyze         ← returns score, label, indicators, top signals, URL intel
        │
        ▼
 React Dashboard          ← renders color-coded threat assessment
```

The model is trained on two combined Kaggle datasets (≈ 80k+ labelled emails). The TF-IDF vectorizer converts email text into a bag-of-words feature matrix, which Logistic Regression uses to estimate phishing probability. Rule-based checks run in parallel to surface specific red flags regardless of model confidence.

---

## Architecture

```
frontend/          React app (deployed on Vercel)
backend/
  app/             FastAPI application
    main.py        Routes + CORS
    predictor.py   Inference logic
    model_loader.py  Cached model loading
    indicators.py  Rule-based indicator detection
  model/           Trained model artifacts (.pkl)
  train/           Production training pipeline
  Dockerfile       Container image definition
  requirements.txt Python dependencies
docs/
  screenshots/     UI screenshots for this README
```

---

## Dataset

This project uses two combined email datasets from Kaggle:

| #   | Author                                | Source                                                                                             | Accessed   |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Ethan Cratchley                       | [Email Phishing Dataset](https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset)    | 2026-03-04 |
| 2   | Naser Abdullah Alam & Amith Khandakar | [Phishing Email Dataset](https://www.kaggle.com/datasets/naserabdullahalam/phishing-email-dataset) | 2026-03-12 |

---

## Local Development

### Prerequisites

- Python 3.11+
- Docker (for container testing)
- Node.js 18+ (for the frontend)

### Backend — run directly

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # edit as needed

uvicorn app.main:app --reload --port 8000
```

| Endpoint         | URL                          |
| ---------------- | ---------------------------- |
| API              | `http://localhost:8000`      |
| Interactive docs | `http://localhost:8000/docs` |

### Backend — run via Docker

```bash
cd backend
docker build -t phishing-api .
docker run -p 8000:8000 --env-file .env phishing-api
```

### Frontend

```bash
cd frontend
cp .env.example .env   # edit VITE_API_URL if needed
npm install
npm run dev
```

### Train the model

```bash
# From the repository root
python backend/train/train_model.py
```

Artifacts are saved to `backend/model/phishing_model.pkl` and `backend/model/vectorizer.pkl`.

---

## API Reference

### `GET /`

Health check.

```json
{ "status": "ok" }
```

---

### `POST /analyze`

Score an email for phishing risk.

**Request body**

```json
{
  "subject": "Urgent: verify your account",
  "body": "Click here to confirm your password immediately."
}
```

**Response**

```json
{
  "phishing_risk": 0.9431,
  "label": "Phishing",
  "indicators": [
    "suspicious language detected",
    "credential harvesting attempt"
  ],
  "top_signals": ["verify", "urgent", "password", "click here"],
  "url_intelligence": [
    {
      "url": "http://bit.ly/3xAbc12",
      "is_suspicious": true,
      "flags": ["URL shortener detected", "plain HTTP (no TLS)"]
    }
  ]
}
```

| Field              | Type       | Description                                           |
| ------------------ | ---------- | ----------------------------------------------------- |
| `phishing_risk`    | `float`    | Probability between `0.0` (safe) and `1.0` (phishing) |
| `label`            | `string`   | Human-readable classification                         |
| `indicators`       | `string[]` | Rule-based red flags detected in the email            |
| `top_signals`      | `string[]` | Strongest TF-IDF features driving the prediction      |
| `url_intelligence` | `object[]` | Extracted URLs with suspicion flags                   |

---

## Deployment

### Backend — Render or Railway

Both platforms build and run the Docker container directly from your repository.

#### Render

1. Go to [render.com](https://render.com) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Set **Root Directory** to `backend`.
4. Set **Environment** to **Docker** — Render detects the `Dockerfile` automatically.
5. Add the environment variable:

   | Key               | Value                         |
   | ----------------- | ----------------------------- |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

6. Deploy. Render exposes a public URL like `https://phishing-api.onrender.com`.

#### Railway

1. Go to [railway.app](https://railway.app) and create a new project from your GitHub repo.
2. Railway auto-detects the `Dockerfile` inside `backend/`.
3. Set **Root Directory** to `backend` in the service settings.
4. Add the environment variable:

   | Key               | Value                         |
   | ----------------- | ----------------------------- |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

5. Railway provides a public URL automatically.

---

### Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Vercel detects the framework (Vite) automatically.
4. Add the environment variable:

   | Key            | Value                                                  |
   | -------------- | ------------------------------------------------------ |
   | `VITE_API_URL` | `https://phishing-api.onrender.com` (your backend URL) |

   > If you are using Create React App instead of Vite, the variable must be named `REACT_APP_API_URL`.

5. Deploy. Vercel provides a public URL like `https://your-app.vercel.app`.
6. Copy that Vercel URL back into the backend's `ALLOWED_ORIGINS` variable on Render/Railway and redeploy the backend so CORS allows requests from your frontend.

---

## Environment Variables Reference

#### Backend (`backend/.env`)

| Variable          | Required         | Description                                                               |
| ----------------- | ---------------- | ------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | Yes (production) | Comma-separated list of frontend origins. Defaults to `*` in development. |

#### Frontend (`frontend/.env`)

| Variable       | Required | Description                                                                 |
| -------------- | -------- | --------------------------------------------------------------------------- |
| `VITE_API_URL` | Yes      | Full URL of the deployed backend, e.g. `https://phishing-api.onrender.com`. |

---

## Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| ML model         | scikit-learn (TF-IDF + Logistic Regression) |
| Backend          | FastAPI + Uvicorn                           |
| Container        | Docker (python:3.11-slim)                   |
| Frontend         | React (Vite) + Tailwind CSS                 |
| Backend hosting  | Render or Railway                           |
| Frontend hosting | Vercel                                      |
