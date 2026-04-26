from __future__ import annotations
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Optional
import scipy.sparse

_ids: list = []
_tfidf_matrix: Optional[scipy.sparse.csr_matrix] = None
_id_to_idx: dict = {}


def build(restaurants):
    """TF-IDF vectorize all restaurants. Does NOT pre-compute the full
    similarity matrix (67k×67k would require ~18GB RAM). Similarity is
    computed on-demand per request instead."""
    global _ids, _tfidf_matrix, _id_to_idx

    features = []
    for r in restaurants:
        cuisines = (r.cuisines or '').replace(',', ' ')
        city = (r.city or '').replace(' ', '_')
        state = (r.state or '').replace(' ', '_')
        price = f"price_{r.price_range or 0}"
        features.append(f"{cuisines} {city} {state} {price}")

    _ids = [r.id for r in restaurants]
    _id_to_idx = {rid: i for i, rid in enumerate(_ids)}

    vectorizer = TfidfVectorizer()
    _tfidf_matrix = vectorizer.fit_transform(features)
    print(f'TF-IDF matrix built: {_tfidf_matrix.shape[0]:,} restaurants × {_tfidf_matrix.shape[1]:,} features')


def get_similar(restaurant_id: str, n: int = 10) -> list:
    """Compute cosine similarity for one restaurant against all others.
    Fast enough on-demand: one sparse matrix-vector multiply."""
    if _tfidf_matrix is None or restaurant_id not in _id_to_idx:
        return []

    idx = _id_to_idx[restaurant_id]
    query_vec = _tfidf_matrix[idx]

    # cosine_similarity returns shape (1, n_restaurants)
    sims = cosine_similarity(query_vec, _tfidf_matrix).flatten()

    # Top-N excluding itself
    top_indices = np.argsort(sims)[::-1]
    result = []
    for i in top_indices:
        if i != idx:
            result.append(_ids[i])
        if len(result) >= n:
            break
    return result


def all_ids() -> list:
    return _ids
