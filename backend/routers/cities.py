from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Restaurant

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("")
def get_cities(db: Session = Depends(get_db)):
    rows = db.query(Restaurant.city).distinct().filter(Restaurant.city != '').all()
    return sorted([r.city for r in rows if r.city])
