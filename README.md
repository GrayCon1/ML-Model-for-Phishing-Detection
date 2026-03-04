# Phishing Detection (Email)

Machine-learning baseline for detecting phishing emails using a labeled dataset and a scikit-learn model.

## Project status

This repository currently contains:
- `train_model.py`: trains and evaluates a **Random Forest** classifier.
- `main.py`: placeholder script (not yet wired to the trained model).

## Dataset (credit)

This project uses the **Email Phishing Dataset** from Kaggle:
- Dataset: *Email Phishing Dataset*
- Author/uploader: **Ethan Cratchley**
- Source: `https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset`
- Accessed: **2026-03-04**

Please review and comply with the dataset’s Kaggle license/terms as listed on the dataset page.

## Tech stack

- **Language**: Python
- **Core libraries**:
  - `pandas` (data loading/manipulation)
  - `numpy` (numeric operations)
  - `scikit-learn` (model training + evaluation)
- **Model**: `RandomForestClassifier`

## Getting started

### Prerequisites

- Python 3.9+ recommended

### Setup

Create and activate a virtual environment, then install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install pandas numpy scikit-learn
```

### Data

`train_model.py` expects the CSV to exist at:

- `phishing_email_dataset.csv` (project root)

If you don’t have it locally, download it from Kaggle (see dataset link above) and place it in the repository root with that exact filename.

## Usage

Train and evaluate the model:

```bash
python3 train_model.py
```

The script prints:
- Train/test split sizes
- Classification report
- Confusion matrix
- Feature importances
- Metrics using a custom probability threshold (currently \(0.4\))

## Repository structure

```text
Phishing_Detection/
├── main.py
├── train_model.py
└── phishing_email_dataset.csv
```

## Notes / next steps (optional)

- Save the trained model (e.g., with `joblib`) so `main.py` can load it and score new emails.
- Move datasets into a `data/` folder and ensure large files are not committed to git.

## Acknowledgements

- Dataset provided by Ethan Cratchley via Kaggle: `https://www.kaggle.com/datasets/ethancratchley/email-phishing-dataset`

