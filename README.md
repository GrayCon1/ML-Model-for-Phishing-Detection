# AI Phishing Detection System

A machine-learning system that scores the phishing risk of an email from its subject and body. It uses a TF-IDF + Logistic Regression pipeline served through a FastAPI backend and a React frontend.

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
```

## Dataset

This project uses the **Email Phishing Dataset** from Kaggle:

- **Author**: Ethan Cratchley
- **Source**: <https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset>
- **Accessed**: 2026-03-04

Please review and comply with the dataset's license on the Kaggle page.

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

# Copy and edit env file
cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

API is available at `http://localhost:8000`.  
Interactive docs at `http://localhost:8000/docs`.

### Backend — run via Docker

```bash
cd backend
docker build -t phishing-api .
docker run -p 8000:8000 --env-file .env phishing-api
```

### Frontend

```bash
cd frontend
cp .env.example .env       # edit VITE_API_URL if needed
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

## API

### `GET /`

Health check.

```json
{ "status": "ok" }
```

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
  "indicators": [
    "suspicious language detected",
    "credential harvesting attempt"
  ]
}
```

`phishing_risk` is a probability between `0.0` (safe) and `1.0` (phishing).

---

## Deployment

### Backend — Render or Railway

Both platforms can build and run a Docker container directly from your repository.

#### Render

1. Go to <https://render.com> and create a new **Web Service**.
2. Connect your GitHub repository.
3. Set **Root Directory** to `backend`.
4. Set **Environment** to **Docker** — Render will detect the `Dockerfile` automatically.
5. Add the following environment variable in the Render dashboard:

   | Key | Value |
   |-----|-------|
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

6. Deploy. Render exposes a public URL like `https://phishing-api.onrender.com`.

#### Railway

1. Go to <https://railway.app> and create a new project from your GitHub repo.
2. Railway auto-detects the `Dockerfile` inside `backend/`.
3. Set **Root Directory** to `backend` in the service settings.
4. Add the environment variable:

   | Key | Value |
   |-----|-------|
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

5. Railway provides a public URL automatically.

---

### Frontend — Vercel

1. Go to <https://vercel.com> and import your GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Vercel detects the framework (Vite/CRA) automatically.
4. Add the following environment variable in the Vercel project settings:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://phishing-api.onrender.com` (your backend URL) |

   > If you are using Create React App instead of Vite, the variable must be named `REACT_APP_API_URL`.

5. Deploy. Vercel provides a public URL like `https://your-app.vercel.app`.
6. Copy that Vercel URL back into the backend's `ALLOWED_ORIGINS` variable on Render/Railway and redeploy the backend so CORS allows requests from your frontend.

---

### Environment Variables Reference

#### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ALLOWED_ORIGINS` | Yes (production) | Comma-separated list of frontend origins. Defaults to `*` in development. |

#### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Full URL of the deployed backend, e.g. `https://phishing-api.onrender.com`. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML model | scikit-learn (TF-IDF + Logistic Regression) |
| Backend | FastAPI + Uvicorn |
| Container | Docker (python:3.11-slim) |
| Frontend | React (Vite) |
| Backend hosting | Render or Railway |
| Frontend hosting | Vercel |

## Acknowledgements

Dataset provided by Ethan Cratchley via Kaggle: <https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset>
