"""
Collaborative filtering via SVD (scikit-surprise).
train() is called from train_cf.py (one-time).
load() is called at FastAPI startup.
"""
import os
import pickle
import numpy as np
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cf_model.pkl')

_algo = None
_user_reviewed: dict = {}   # user_id -> set of business_ids they rated


def train(db, min_user_reviews: int = 3, min_biz_reviews: int = 5,
          n_factors: int = 50, n_epochs: int = 20):
    from models import Review
    from collections import Counter
    import pandas as pd
    from surprise import SVD, Dataset, Reader

    global _algo, _user_reviewed

    print('Querying reviews from DB...')
    rows = db.query(Review.user_id, Review.business_id, Review.stars).all()
    print(f'  {len(rows):,} total reviews')

    user_counts = Counter(r[0] for r in rows)
    biz_counts  = Counter(r[1] for r in rows)

    filtered = [
        (u, b, s) for u, b, s in rows
        if user_counts[u] >= min_user_reviews and biz_counts[b] >= min_biz_reviews
    ]
    print(f'  {len(filtered):,} reviews after filtering '
          f'(users>={min_user_reviews}, businesses>={min_biz_reviews})')

    _user_reviewed = {}
    for u, b, _ in filtered:
        _user_reviewed.setdefault(u, set()).add(b)

    df = pd.DataFrame(filtered, columns=['user_id', 'business_id', 'stars'])
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(df, reader)
    trainset = data.build_full_trainset()

    print(f'  Training SVD (factors={n_factors}, epochs={n_epochs})...')
    algo = SVD(n_factors=n_factors, n_epochs=n_epochs,
               lr_all=0.005, reg_all=0.02, verbose=True)
    algo.fit(trainset)

    _algo = algo
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump((_algo, _user_reviewed), f)
    print(f'Model saved to {MODEL_PATH}')


def load() -> bool:
    global _algo, _user_reviewed
    if not os.path.exists(MODEL_PATH):
        return False
    print('Loading CF model from disk...')
    with open(MODEL_PATH, 'rb') as f:
        _algo, _user_reviewed = pickle.load(f)
    print(f'  CF model ready ({len(_user_reviewed):,} users in training set)')
    return True


def is_known_user(user_id: str) -> bool:
    return user_id in _user_reviewed


def predict(user_id: str, n: int = 10) -> list:
    """
    Vectorized SVD prediction: computes scores for ALL known items in one
    matrix multiply, then returns top-N unreviewed business IDs.
    """
    if _algo is None or not is_known_user(user_id):
        return []

    trainset = _algo.trainset
    reviewed = _user_reviewed.get(user_id, set())

    try:
        u_inner = trainset.to_inner_uid(user_id)
    except ValueError:
        return []

    mu    = trainset.global_mean
    pu_u  = _algo.pu[u_inner]           # (n_factors,)
    bu_u  = _algo.bu[u_inner]           # scalar

    # score[i] = mu + bu[u] + bi[i] + pu[u] · qi[i]
    all_scores = mu + bu_u + _algo.bi + _algo.qi.dot(pu_u)   # (n_items,)

    sorted_inner = np.argsort(all_scores)[::-1]

    result = []
    for inner_id in sorted_inner:
        try:
            bid = trainset.to_raw_iid(int(inner_id))
        except ValueError:
            continue
        if bid not in reviewed:
            result.append(bid)
            if len(result) >= n:
                break

    return result


def get_user_stats(user_id: str) -> Optional[dict]:
    if not is_known_user(user_id):
        return None
    return {'review_count': len(_user_reviewed[user_id])}
