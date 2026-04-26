from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from database import get_db
from models import Restaurant
from schemas import RestaurantBase, RestaurantList
import recommender

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.get("", response_model=RestaurantList)
def search_restaurants(
    q: Optional[str] = None,
    city: Optional[str] = None,
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_cost: Optional[int] = None,
    delivery: Optional[bool] = None,
    booking: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Restaurant)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            Restaurant.name.ilike(like),
            Restaurant.cuisines.ilike(like),
        ))
    if city:
        query = query.filter(Restaurant.city.ilike(f"%{city}%"))
    if cuisine:
        query = query.filter(Restaurant.cuisines.ilike(f"%{cuisine}%"))
    if min_rating is not None:
        query = query.filter(Restaurant.aggregate_rating >= min_rating)
    if max_cost is not None:
        query = query.filter(Restaurant.average_cost_for_two <= max_cost)
    if delivery is not None:
        query = query.filter(Restaurant.has_online_delivery == (1 if delivery else 0))
    if booking is not None:
        query = query.filter(Restaurant.has_table_booking == (1 if booking else 0))

    total = query.count()
    offset = (page - 1) * limit
    results = query.order_by(Restaurant.aggregate_rating.desc()).offset(offset).limit(limit).all()

    return RestaurantList(total=total, page=page, limit=limit, results=results)


@router.get("/{restaurant_id}", response_model=RestaurantBase)
def get_restaurant(restaurant_id: str, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return r


@router.get("/{restaurant_id}/similar", response_model=list[RestaurantBase])
def get_similar(
    restaurant_id: str,
    n: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    similar_ids = recommender.get_similar(restaurant_id, n)
    if not similar_ids:
        return []
    restaurants = db.query(Restaurant).filter(Restaurant.id.in_(similar_ids)).all()
    id_order = {rid: i for i, rid in enumerate(similar_ids)}
    return sorted(restaurants, key=lambda r: id_order.get(r.id, 999))
