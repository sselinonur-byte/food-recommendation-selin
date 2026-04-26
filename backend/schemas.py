from pydantic import BaseModel
from typing import Optional


class RestaurantBase(BaseModel):
    id: str
    name: str
    cuisines: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    average_cost_for_two: Optional[int] = None
    price_range: Optional[int] = None
    aggregate_rating: Optional[float] = None
    votes: Optional[int] = None
    rating_text: Optional[str] = None
    has_online_delivery: Optional[int] = None
    has_table_booking: Optional[int] = None
    featured_image: Optional[str] = None
    zomato_url: Optional[str] = None
    currency: Optional[str] = None

    model_config = {"from_attributes": True}


class RestaurantList(BaseModel):
    total: int
    page: int
    limit: int
    results: list[RestaurantBase]
