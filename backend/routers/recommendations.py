from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from collections import Counter
from typing import Optional
from database import get_db
from models import Restaurant, Review
import cf_model

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

_CF_POOL = 500

# Too generic to be meaningful as a reason
_SKIP_CATS = {
    'Restaurants', 'Food', 'Nightlife', 'Shopping', 'Local Services',
    'Event Planning & Services', 'Arts & Entertainment', 'Active Life',
    'Hotels & Travel', 'Health & Medical', 'Beauty & Spas',
    'Automotive', 'Home Services', 'Financial Services', 'Education',
}


def _user_top_categories(db: Session, user_id: str, min_stars: float = 4.0, top_n: int = 30) -> list:
    """Return the categories this user rates highest, ordered by frequency."""
    rows = (
        db.query(Review.business_id)
        .filter(Review.user_id == user_id, Review.stars >= min_stars)
        .all()
    )
    if not rows:
        return []

    biz_ids = [r.business_id for r in rows]
    businesses = (
        db.query(Restaurant.cuisines)
        .filter(Restaurant.id.in_(biz_ids), Restaurant.cuisines.isnot(None))
        .all()
    )

    counts = Counter()
    for (cats,) in businesses:
        for cat in cats.split(','):
            cat = cat.strip()
            if cat and cat not in _SKIP_CATS:
                counts[cat] += 1

    return [cat for cat, _ in counts.most_common(top_n)]


def _reasons_for(restaurant, user_top_cats: list, max_reasons: int = 3) -> list:
    """Which of the user's top categories appear in this restaurant's categories."""
    if not restaurant.cuisines or not user_top_cats:
        return []
    rest_cats = {c.strip() for c in restaurant.cuisines.split(',')}
    # Preserve ranking order from user_top_cats
    return [c for c in user_top_cats if c in rest_cats][:max_reasons]


@router.get("", response_model=dict)
def get_recommendations(
    user_id: str,
    n: int = Query(10, ge=1, le=50),
    city: Optional[str] = None,
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_cost: Optional[int] = None,
    price_range: Optional[int] = None,
    delivery: Optional[bool] = None,
    booking: Optional[bool] = None,
    open_only: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    if cf_model.is_known_user(user_id):
        user_top_cats = _user_top_categories(db, user_id)

        candidate_ids = cf_model.predict(user_id, _CF_POOL)
        cf_rank = {bid: i for i, bid in enumerate(candidate_ids)}

        query = db.query(Restaurant).filter(Restaurant.id.in_(candidate_ids))
        query = _apply_filters(query, city, cuisine, min_rating, max_cost, price_range, delivery, booking, open_only)
        matches = query.all()
        matches.sort(key=lambda r: cf_rank.get(r.id, _CF_POOL))
        results = matches[:n]

        stats = cf_model.get_user_stats(user_id)
        return {
            "personalized": True,
            "user_id": user_id,
            "review_count": stats["review_count"] if stats else 0,
            "user_top_categories": user_top_cats[:10],
            "candidate_pool": len(candidate_ids),
            "after_filters": len(matches),
            "results": [
                {**_serialize(r), "reasons": _reasons_for(r, user_top_cats)}
                for r in results
            ],
        }
    else:
        query = db.query(Restaurant).filter(Restaurant.aggregate_rating >= 3.5)
        query = _apply_filters(query, city, cuisine, min_rating, max_cost, price_range, delivery, booking, open_only)
        results = query.order_by(Restaurant.votes.desc()).limit(n).all()
        return {
            "personalized": False,
            "user_id": user_id,
            "review_count": 0,
            "user_top_categories": [],
            "candidate_pool": 0,
            "after_filters": len(results),
            "results": [{**_serialize(r), "reasons": []} for r in results],
        }


def _apply_filters(query, city, cuisine, min_rating, max_cost, price_range, delivery, booking, open_only):
    if city:
        query = query.filter(Restaurant.city.ilike(f"%{city}%"))
    if cuisine:
        query = query.filter(Restaurant.cuisines.ilike(f"%{cuisine}%"))
    if min_rating is not None:
        query = query.filter(Restaurant.aggregate_rating >= min_rating)
    if max_cost is not None:
        query = query.filter(Restaurant.average_cost_for_two <= max_cost)
    if price_range is not None:
        query = query.filter(Restaurant.price_range == price_range)
    if delivery is not None:
        query = query.filter(Restaurant.has_online_delivery == (1 if delivery else 0))
    if booking is not None:
        query = query.filter(Restaurant.has_table_booking == (1 if booking else 0))
    if open_only:
        query = query.filter(Restaurant.is_open == 1)
    return query


@router.get("/sample-users")
def get_sample_users():
    import json, os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sample_users.json')
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


def _serialize(r):
    return {
        "id": r.id, "name": r.name, "cuisines": r.cuisines,
        "city": r.city, "state": r.state, "locality": r.locality,
        "address": r.address, "latitude": r.latitude, "longitude": r.longitude,
        "average_cost_for_two": r.average_cost_for_two, "price_range": r.price_range,
        "aggregate_rating": r.aggregate_rating, "votes": r.votes,
        "rating_text": r.rating_text, "has_online_delivery": r.has_online_delivery,
        "has_table_booking": r.has_table_booking, "is_open": r.is_open,
        "featured_image": r.featured_image, "zomato_url": r.zomato_url,
        "currency": r.currency,
    }
