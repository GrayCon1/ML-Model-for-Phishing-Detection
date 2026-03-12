import numpy as np
from typing import List

def explain_prediction(text: str, model, vectorizer, top_n: int = 5) -> List[str]:
    "Top influential words pushing the prediction towards phishing\n"

    # Vectorize the input text
    X = vectorizer.transform([text])

    # Extract features and logistic regression coefficients
    feature_names = vectorizer.get_feature_names_out()
    # Assuming binary classification, coef_ shape is (1, n_features)
    coefs = model.coef_[0]

    # Calculate the contribution of each word present in email
    dense_X = X.toarray()[0]
    contributions = dense_X * coefs

    # Sort indices by highest contribution (Descending)
    top_indices = np.argsort(contributions)[::-1]

    top_signals = []
    for idx in top_indices:
        # Only consider words that are present in the email (contribution > 0)
        if contributions[idx] > 0 and dense_X[idx] > 0:
            top_signals.append(feature_names[idx])
        
        if len(top_signals) >= top_n:
            break
    return top_signals