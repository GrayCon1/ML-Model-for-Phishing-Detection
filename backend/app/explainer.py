import numpy as np
from typing import List

# Words we want to ignore in the "Top Signals" UI because they are too generic
IGNORED_SIGNALS = {"com", "http", "https", "www", "your", "this", "that", "the", "and"}

def explain_prediction(text: str, model, vectorizer, top_n: int = 5) -> List[str]:
    X = vectorizer.transform([text])
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_[0]
    dense_X = X.toarray()[0]
    
    # Calculate contribution: (Frequency/Importance in this email) * (Model's weight for that word)
    contributions = dense_X * coefs
    
    # Sort indices by highest contribution
    top_indices = np.argsort(contributions)[::-1]

    top_signals = []
    for idx in top_indices:
        word = feature_names[idx]
        
        # FILTER: Skip common noise words and words with zero contribution
        if contributions[idx] > 0 and dense_X[idx] > 0:
            if word.lower() not in IGNORED_SIGNALS and len(word) > 2:
                top_signals.append(word)
        
        if len(top_signals) >= top_n:
            break
            
    return top_signals