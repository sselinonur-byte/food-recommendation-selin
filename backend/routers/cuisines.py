from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Restaurant

router = APIRouter(prefix="/api/cuisines", tags=["cuisines"])


@router.get("")
def get_cuisines(db: Session = Depends(get_db)):
    rows = db.query(Restaurant.cuisines).filter(Restaurant.cuisines != '').all()
    unique = set()
    for row in rows:
        for c in (row.cuisines or '').split(','):
            c = c.strip()
            if c:
                unique.add(c)
    return sorted(unique)
