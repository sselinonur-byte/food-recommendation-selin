from sqlalchemy import Column, Index, Integer, Float, Text
from database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    cuisines = Column(Text)
    city = Column(Text)
    state = Column(Text)
    locality = Column(Text)
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    average_cost_for_two = Column(Integer)
    price_range = Column(Integer)
    aggregate_rating = Column(Float)
    votes = Column(Integer)
    rating_text = Column(Text)
    has_online_delivery = Column(Integer)
    has_table_booking = Column(Integer)
    is_open = Column(Integer)
    featured_image = Column(Text)
    zomato_url = Column(Text)
    currency = Column(Text)


class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Text, primary_key=True)
    user_id = Column(Text, nullable=False)
    business_id = Column(Text, nullable=False)
    stars = Column(Float)
    date = Column(Text)
    useful = Column(Integer, default=0)
    funny = Column(Integer, default=0)
    cool = Column(Integer, default=0)

    __table_args__ = (
        Index("ix_reviews_user_id", "user_id"),
        Index("ix_reviews_business_id", "business_id"),
    )
