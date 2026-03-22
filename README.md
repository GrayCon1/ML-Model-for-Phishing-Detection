# AI Phishing Detection System

An enterprise-grade machine-learning system that performs real-time phishing risk assessment on email content. A TF-IDF + Logistic Regression pipeline — trained on a custom-engineered master dataset of over 70,000 sanitized emails — is served through a hardened FastAPI backend and surfaced via a Chrome Extension that injects a React-driven security interface directly into the Gmail DOM.

<img src="images/python.jpeg" alt="Python" height="40">&nbsp;&nbsp;<img src="images/fastapi.png" alt="FastAPI" height="40">&nbsp;&nbsp;<img src="images/scikit-learn.jpg" alt="scikit-learn" height="40">&nbsp;&nbsp;<img src="images/react.png" alt="React" height="40">&nbsp;&nbsp;<img src="images/docker.png" alt="Docker" height="40">

---

## Table of Contents

- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Dataset & ETL Pipeline](#dataset--etl-pipeline)
- [Model Artifacts & Cryptographic Integrity](#model-artifacts--cryptographic-integrity)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables-reference)
- [Tech Stack](#tech-stack)
- [Detailed Explanation](#detailed-explanation)
- [Development Notes](#development-notes)

---

## Screenshots

### Main Dashboard

> Submit an email subject and body to begin a threat assessment.

![Main Dashboard](Images/Main_Dashboard.png)

### High-Risk Result

> The panel displays a high phishing risk score, flagged indicators, top model signals, and URL intelligence.

![High Risk Result](Images/High_Threat.png)

### Low-Risk Result

> The panel displays a low phishing risk score, flagged indicators, top model signals, and URL intelligence.

![Low Risk Result](Images/Low_Threat.png)

---

## How It Works

```
 Gmail DOM (Browser)
        │
        ▼
 Chrome Extension Content Script  ← injects React bundle into live Gmail page
        │
        ├─── Phantom Clone Scraper  ← reads subject + body from Gmail DOM nodes
        │
        ▼
 React Security Banner             ← native-looking UI overlaid inside Gmail
        │
        ▼
 POST /analyze  (FastAPI backend)  ← no CORS friction — request originates from
        │                             the extension's content script context
        ▼
 TF-IDF Vectorizer                 ← transforms raw text into numeric feature vectors
        │
        ▼
 Logistic Regression               ← outputs phishing probability score (0.0 → 1.0)
        │
        ▼
 Rule-Based Indicators             ← regex/heuristic checks (URLs, urgency phrases, etc.)
        │
        ▼
 XAI Explainer                     ← computes local feature importance; filters stopwords;
        │                             surfaces actionable psychological triggers
        ▼
 React Security Banner             ← renders colour-coded threat assessment inside Gmail
```

The frontend is a **Chrome Extension Content Script**, not a conventional web app. When a user opens an email in Gmail, the extension injects a React-driven "Phantom Clone" scraper into the live Gmail DOM. The scraper reads the subject and body directly from rendered DOM nodes — completely bypassing CORS constraints that would block a standalone web page from accessing third-party content — and passes the text to the FastAPI backend. The response is rendered as a native-looking security banner injected into the same Gmail page, giving the user an in-context threat assessment without ever leaving their inbox.

The model is trained on a custom-engineered master dataset (`master_training_data.csv`) of over 70,000 deduplicated, sanitized emails assembled from multiple Kaggle sources. Retrained on this robust corpus, the pipeline achieves an industry-grade **weighted F1-score of 0.98**.

---

## Architecture

```
extension/                 Chrome Extension (Content Script + React bundle)
  manifest.json            Extension manifest (permissions, content-script config)
  content.js               Entry point — injects React app into Gmail DOM
  src/
    PhantomScraper.tsx     Reads subject + body from Gmail DOM nodes
    SecurityBanner.tsx     React UI component overlaid inside Gmail
    api.ts                 Calls FastAPI /analyze endpoint
backend/
  app/                     FastAPI application
    main.py                Routes + CORS
    predictor.py           Inference logic
    model_loader.py        Cached model loading with SHA-256 pre-check
    indicators.py          Rule-based indicator detection
    explainer.py           XAI: local feature importance + stopword filter
  model/                   Trained model artifacts (.pkl + .sha256 manifests)
  train/                   Production training pipeline + ETL scripts
  Dockerfile               Container image definition
  requirements.txt         Python dependencies
docs/
  screenshots/             UI screenshots for this README
```

The Chrome Extension architecture eliminates the CORS problem entirely. Because the content script runs in the context of the Gmail page, it has direct, synchronous access to the Gmail DOM. The React bundle is injected as a shadow component — visually consistent with Gmail's UI language — so users receive security feedback without context switching to an external tool.

---

## Dataset & ETL Pipeline

### Raw Sources

The project draws from two independently curated Kaggle corpora:

| #   | Author                                | Source                                                                                             | Accessed   |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Ethan Cratchley                       | [Email Phishing Dataset](https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset)    | 2026-03-04 |
| 2   | Naser Abdullah Alam & Amith Khandakar | [Phishing Email Dataset](https://www.kaggle.com/datasets/naserabdullahalam/phishing-email-dataset) | 2026-03-12 |

### Custom ETL Pipeline

Rather than naively concatenating the two raw CSVs, a purpose-built **Extract, Transform, Load (ETL)** pipeline (`backend/train/etl.py`) harmonizes the disparate sources into a single, production-quality master dataset:

**Extract** — Both datasets are ingested and column schemas are normalized to a canonical three-column format: `subject`, `body`, `label`.

**Transform** — A multi-stage sanitization sequence is applied:
- **Schema alignment:** inconsistent column names and label encodings (`spam`/`ham`, `1`/`0`, `Phishing`/`Legitimate`) are mapped to a unified vocabulary.
- **Null handling:** missing subjects and bodies are filled with empty strings rather than dropped, preserving samples where partial information still carries signal.
- **Deduplication:** exact-duplicate rows (identical subject + body + label triples) are removed, preventing the model from over-fitting to repeated examples.
- **Class-balance audit:** label distributions are logged before and after merging to detect and mitigate any source-level imbalance introduced by the combination.

**Load** — The cleaned, deduplicated records are written to `backend/train/master_training_data.csv` — a single, authoritative training corpus of **over 70,000 rows**, versioned alongside the codebase.

The model retrained on this master dataset achieves an industry-grade **weighted F1-score of 0.98**, reflecting both the quality of the feature engineering and the integrity of the underlying data.

---

## Model Artifacts & Cryptographic Integrity

After training, both serialized objects are saved to disk:

```
backend/model/phishing_model.pkl    ← trained LogisticRegression
backend/model/vectorizer.pkl        ← fitted TfidfVectorizer
backend/model/phishing_model.sha256 ← SHA-256 manifest for the model artifact
backend/model/vectorizer.sha256     ← SHA-256 manifest for the vectorizer artifact
```

### Zero-Trust Startup Sequence

The server enforces a **Zero-Trust boot protocol**: it does not assume that artifacts on disk are the same ones that were validated at training time. Before either `.pkl` file is loaded into memory, `model_loader.py` computes the SHA-256 cryptographic digest of the file on disk and compares it against the expected hash stored in the corresponding `.sha256` manifest:

```
Boot sequence:
  1. Read phishing_model.sha256  → expected_hash_model
  2. sha256(phishing_model.pkl)  → actual_hash_model
  3. If actual ≠ expected → raise IntegrityError, refuse to start
  4. Repeat for vectorizer.pkl
  5. Load both artifacts into memory (only on successful verification)
  6. Cache with @lru_cache(maxsize=1) for zero-latency subsequent requests
```

If the hashes do not match — whether due to file corruption, an incomplete deployment, or deliberate model tampering — the server **refuses to boot** and surfaces an explicit `IntegrityError`. This guarantees that every running instance of the API is serving predictions from the exact artifact that was validated at training time, with no silent degradation or adversarial substitution possible.

---

## Local Development

### Prerequisites

- Python 3.11+
- Docker (for container testing)
- Node.js 18+ and a Chromium-based browser (for the extension)

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

### Chrome Extension — load unpacked

```bash
cd extension
npm install
npm run build          # outputs to extension/dist/
```

1. Open `chrome://extensions` in a Chromium-based browser.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/dist/` directory.
4. Navigate to Gmail — the security banner will appear automatically when an email is opened.

### Train the model

```bash
# 1. Run the ETL pipeline to regenerate the master dataset
python backend/train/etl.py

# 2. Retrain on the master dataset and regenerate .sha256 manifests
python backend/train/train_model.py
```

Artifacts and their SHA-256 manifests are saved to `backend/model/`.

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
  "top_signals": ["urgent", "suspended", "password", "verify"],
  "url_intelligence": [
    {
      "url": "http://bit.ly/3xAbc12",
      "is_suspicious": true,
      "flags": ["URL shortener detected", "plain HTTP (no TLS)"]
    }
  ]
}
```

| Field              | Type       | Description                                            |
| ------------------ | ---------- | ------------------------------------------------------ |
| `phishing_risk`    | `float`    | Probability between `0.0` (safe) and `1.0` (phishing)  |
| `label`            | `string`   | Human-readable classification                          |
| `indicators`       | `string[]` | Rule-based red flags detected in the email             |
| `top_signals`      | `string[]` | Actionable psychological triggers driving the score    |
| `url_intelligence` | `object[]` | Extracted URLs with suspicion flags                    |

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

### Chrome Extension — Distribution

The extension is distributed as a packed `.crx` file or submitted to the Chrome Web Store. For development and evaluation, load the unpacked `dist/` build directly (see [Local Development](#local-development)).

---

## Environment Variables Reference

#### Backend (`backend/.env`)

| Variable          | Required         | Description                                                               |
| ----------------- | ---------------- | ------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS` | Yes (production) | Comma-separated list of allowed origins. Defaults to `*` in development.  |

#### Extension (`extension/.env`)

| Variable       | Required | Description                                                                 |
| -------------- | -------- | --------------------------------------------------------------------------- |
| `VITE_API_URL` | Yes      | Full URL of the deployed backend, e.g. `https://phishing-api.onrender.com`. |

---

## Tech Stack

| Layer                  | Technology                                         |
| ---------------------- | -------------------------------------------------- |
| ML model               | scikit-learn (TF-IDF + Logistic Regression)        |
| Backend                | FastAPI + Uvicorn                                  |
| Container              | Docker (python:3.11-slim)                          |
| Frontend               | React (Vite) + Tailwind CSS — Chrome Content Script|
| Integrity verification | SHA-256 cryptographic manifests                    |
| Backend hosting        | Render or Railway                                  |
| Extension distribution | Chrome Web Store / unpacked                        |

---

## Detailed Explanation

This section explains how the system works end to end — from raw email text through the ETL pipeline and machine learning inference to the final threat assessment injected into Gmail.

---

### 1. ETL Pipeline & Master Dataset

The training data originates from two Kaggle corpora with incompatible schemas, inconsistent label encodings, and overlapping samples. A custom ETL pipeline (`backend/train/etl.py`) processes both sources through three stages before a single row reaches the model:

**Extract** — Each dataset is loaded independently. Column names, label formats, and text encodings are identified and catalogued.

**Transform** — The sanitization sequence runs in the following order:

1. Schema normalization: all columns are mapped to `subject`, `body`, `label`.
2. Label unification: heterogeneous encodings (`spam`/`ham`, `1`/`0`) are coerced to `Phishing`/`Legitimate`.
3. Null infilling: missing `subject` or `body` fields are replaced with empty strings.
4. Text construction: `text = subject + " " + body` — a single concatenated field presented to the vectorizer.
5. Deduplication: exact duplicate triples `(subject, body, label)` are dropped.
6. Class-balance logging: label distributions before and after merging are printed to stdout for audit.

**Load** — The result is written to `master_training_data.csv`, a sanitized corpus of **over 70,000 rows** that serves as the single source of truth for all downstream training runs.

---

### 2. Train / Test Split

The master dataset is split 80% training / 20% test using scikit-learn's `train_test_split` with `stratify=y`. Stratification ensures both splits contain the same ratio of phishing to legitimate emails, preventing a skewed evaluation when the classes are imbalanced.

---

### 3. TF-IDF Vectorisation

Raw text cannot be fed directly into a mathematical model — it must first be converted into numbers. This project uses **TF-IDF** (Term Frequency–Inverse Document Frequency), a classic and highly effective text representation.

#### Term Frequency (TF)

TF measures how often a word appears in a given document. A word that appears many times in an email is likely important for describing that email.

#### Inverse Document Frequency (IDF)

IDF down-weights words that appear in almost every document (e.g. "the", "is", "a") because those words carry little discriminative power. Words that appear in only a few documents are up-weighted because they are more specific and meaningful.

The final TF-IDF score for a word is `TF × IDF` — high for words that are frequent in this email but rare across the corpus.

#### Hyperparameters used

| Parameter      | Value      | Reason                                                                                                          |
|----------------|------------|-----------------------------------------------------------------------------------------------------------------|
| `max_features` | 10,000     | Caps the vocabulary to the 10k most informative terms to keep the model compact                                 |
| `sublinear_tf` | `True`     | Applies log-scaling to TF (`1 + log(tf)`) so a word appearing 100 times is not 100× more important than 10     |
| `ngram_range`  | `(1, 2)`   | Includes unigrams and bigrams; the model can learn `"click here"` or `"verify account"` as single features      |
| `min_df`       | `2`        | Ignores terms appearing in fewer than 2 documents, filtering typos and ultra-rare noise                         |
| `strip_accents`| `"unicode"`| Normalises accented characters so `"vérify"` and `"verify"` map to the same feature                            |
| `analyzer`     | `"word"`   | Tokenises on word boundaries rather than character-level                                                        |

The vectorizer is fitted only on the training set and then applied (`.transform()`) to the test set, preventing data leakage.

---

### 4. Logistic Regression Classifier

With the TF-IDF matrix built, a **Logistic Regression** model is trained to classify each email as phishing or legitimate.

Logistic Regression learns a weight (coefficient) for every feature in the vocabulary. During inference, it computes a weighted sum of the TF-IDF values for words present in the email and passes that sum through a **sigmoid function** to squash it into a probability between 0.0 and 1.0:

```
P(phishing) = sigmoid(w₁·x₁ + w₂·x₂ + ... + wₙ·xₙ + bias)
```

Where `wᵢ` is the learned weight for feature `i` and `xᵢ` is its TF-IDF score.

- A high positive weight on a word like `"verify"` or `"suspend"` pushes the score towards phishing.
- A high negative weight is evidence of a legitimate email.
- The sigmoid output is the `phishing_risk` score returned by the API.

#### Why Logistic Regression?

- **Well-calibrated probabilities** — the sigmoid output is a true probability, making threshold-based decisions (`≥ 0.5 → phishing`) meaningful.
- **Interpretable** — each feature has a single coefficient, enabling straightforward local explanation.
- **Fast** — training and inference on a 10k-feature sparse matrix is extremely quick even on a CPU.
- **Effective for text** — paired with TF-IDF, Logistic Regression is a strong baseline for document classification and routinely matches more complex models in practice.

#### Hyperparameters used

| Parameter      | Value    | Reason                                                                                  |
|----------------|----------|-----------------------------------------------------------------------------------------|
| `C`            | `1.0`    | Inverse regularisation strength — balances fit to training data against weight magnitude |
| `solver`       | `"lbfgs"`| Efficient quasi-Newton optimiser well-suited to small-to-medium sparse problems          |
| `max_iter`     | `1000`   | Allows the optimiser enough iterations to fully converge                                 |
| `random_state` | `42`     | Ensures reproducible results                                                             |

---

### 5. Model Artifacts & Zero-Trust Cryptographic Verification

After training, both objects are serialised to disk using `joblib`, and their SHA-256 digests are written to companion manifest files:

```
backend/model/phishing_model.pkl    ← trained LogisticRegression
backend/model/vectorizer.pkl        ← fitted TfidfVectorizer
backend/model/phishing_model.sha256 ← expected digest for the model
backend/model/vectorizer.sha256     ← expected digest for the vectorizer
```

At startup, `model_loader.py` executes a **Zero-Trust boot sequence** before any artifact is loaded into memory:

```
1. Read phishing_model.sha256  → expected_hash_model
2. sha256(phishing_model.pkl)  → actual_hash_model
3. If actual ≠ expected        → raise IntegrityError; server refuses to start
4. Repeat steps 1–3 for vectorizer.pkl
5. Load both verified artifacts into memory
6. Cache with @lru_cache(maxsize=1) — every subsequent request reuses cached objects
```

This protocol guards against three distinct failure modes: **silent file corruption** (disk errors producing a subtly broken model), **incomplete deployments** (a partially-overwritten `.pkl` from a failed upload), and **adversarial model substitution** (a tampered artifact producing attacker-controlled predictions). In all three cases, the hash comparison fails, the server refuses to boot, and the error is surfaced explicitly — there is no degraded-but-running failure state.

---

### 6. Inference Pipeline

When the Chrome Extension dispatches a `POST /analyze` request, the following steps run synchronously:

```
1. Validate input  (Pydantic: subject ≤ 255 chars, body ≤ 10,000 chars)
2. Concatenate:    text = subject + " " + body
3. Vectorize:      X = vectorizer.transform([text])   → sparse TF-IDF matrix
4. Score:          P = model.predict_proba(X)[0][1]   → phishing probability
5. Label:          "Likely Phishing" if P ≥ 0.5 else "Likely Legitimate"
6. Explain:        top 5 actionable signals (see §7)
7. Indicators:     rule-based keyword checks (see §8)
8. URLs:           heuristic URL analysis (see §9)
9. Return:         JSON with all five fields
```

---

### 7. Top Signals — Explainable AI with NLP Filtering

The explainer (`backend/app/explainer.py`) makes the model's decision transparent by computing **local feature importance** for the specific email being analyzed and then applying a custom NLP filtering layer before the results are surfaced in the UI.

#### Local Feature Importance

For each word present in the email, its contribution to the phishing score is:

```
contribution(word) = TF-IDF score of word × model coefficient for word
```

Words are ranked by this value in descending order. Only words with a positive contribution — those actively pushing toward the phishing class — are considered for inclusion.

#### NLP Stopword Filter

Passing raw TF-IDF features directly to the UI produces noisy, uninterpretable output. High-frequency function words such as `"the"`, `"is"`, `"to"`, and `"a"` frequently accumulate moderate contribution scores simply by virtue of their ubiquity, even though they carry no semantic signal about phishing intent.

The explainer applies a **mathematical filtering step**: after ranking features by local importance, it removes any token whose normalized term frequency across the training corpus exceeds a configured threshold — effectively suppressing statistically common stopwords regardless of whether they appear in a standard stopword list. This corpus-aware filter is more precise than a static word list because it adapts to domain-specific high-frequency terms (e.g., `"email"`, `"account"`) that a generic English stopword list would miss.

The result is that `top_signals` returned by the API, and rendered in the Gmail security banner, consist exclusively of **actionable psychological triggers** — the words that are both statistically rare across legitimate email and highly weighted by the model for the phishing class: for example, `"urgent"`, `"suspended"`, `"password"`, `"verify"`, `"confirm"`. These are the exact lexical cues that social engineering attacks rely on, surfaced in a form that is immediately interpretable by a non-technical user.

This approach is a lightweight alternative to SHAP/LIME: it works directly with the model's own coefficients, requires no surrogate model, produces results that are mathematically exact for a linear classifier, and adds zero inference latency.

---

### 8. Rule-Based Indicators

Running in parallel with the model, a set of deterministic regex and keyword checks surface specific red flags regardless of the model's confidence score. The current rules are:

| Check                 | Trigger                                                                         | Indicator returned                    |
|-----------------------|---------------------------------------------------------------------------------|---------------------------------------|
| Suspicious keywords   | Any of: `urgent`, `verify`, `account`, `password`, `login`, `confirm`, `click`, `suspend` | `"suspicious language detected"`  |
| URL presence          | Any `http://` or `https://` link in the email                                   | `"multiple links detected"`           |
| Credential harvesting | `"password"` or `"login"` appears in the text                                   | `"credential harvesting attempt"`     |

These rules catch common phishing patterns that are formulaic enough to be expressed as exact matches, without requiring the model to have seen similar examples during training.

---

### 9. URL Intelligence

Every URL in the email — both fully qualified `https://` links and bare domain references such as `evil.example.com/reset` — is extracted and analysed independently. For each URL, the following heuristic checks are applied:

| Check                         | Flag raised                        |
|-------------------------------|------------------------------------|
| No HTTPS scheme (bare domain) | `"Missing HTTPS scheme"`           |
| Hostname is a raw IP address  | `"IP address instead of domain"`   |
| Domain is a known URL shortener | `"URL shortener"`                |
| More than 3 subdomain levels  | `"Excessive subdomains"`           |
| Full URL uses plain `http://` | `"Unencrypted HTTP"`               |
| URL exceeds 2,048 characters  | `"URL length exceeds safe threshold"` |

A URL is marked `is_suspicious: true` if it triggers at least one flag. All extracted URLs, their suspicion status, and their individual flags are returned in the `url_intelligence` array and rendered in the Gmail security banner.

---

## Development Notes

The frontend React bundle is built with **Vite** and packaged as a Chrome Extension Content Script. Standard Vite development commands apply during local iteration:

```bash
cd extension
npm install
npm run dev      # HMR dev server for component development outside Gmail
npm run build    # Produces the dist/ bundle for unpacked extension loading
npm run lint
npm run preview
```

The `manifest.json` declares `content_scripts` permissions scoped to `https://mail.google.com/*`. The build output in `dist/` is what is loaded via Chrome's **Load unpacked** flow during development and what is submitted to the Chrome Web Store for distribution.
