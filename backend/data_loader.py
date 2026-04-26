"""Run once: python data_loader.py  — loads file1.json into restaurants.db"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Restaurant, Base

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'file1.json')


def load():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    with open(DATA_PATH, encoding='utf-8') as f:
        raw = json.load(f)

    seen = set()
    inserted = 0
    skipped = 0

    for batch in raw:
        for entry in batch.get('restaurants', []):
            r = entry.get('restaurant', {})
            rid = str(r.get('R', {}).get('res_id', ''))
            if not rid or rid in seen:
                skipped += 1
                continue

            name = r.get('name', '').strip()
            if not name or name.lower() in ('', 'unknown'):
                skipped += 1
                continue

            seen.add(rid)
            loc = r.get('location', {})
            rating = r.get('user_rating', {})

            rec = Restaurant(
                id=rid,
                name=name,
                cuisines=r.get('cuisines', ''),
                city=loc.get('city', ''),
                locality=loc.get('locality', ''),
                address=loc.get('address', ''),
                latitude=_float(loc.get('latitude')),
                longitude=_float(loc.get('longitude')),
                average_cost_for_two=_int(r.get('average_cost_for_two')),
                price_range=_int(r.get('price_range')),
                aggregate_rating=_float(rating.get('aggregate_rating')),
                votes=_int(rating.get('votes')),
                rating_text=rating.get('rating_text', ''),
                has_online_delivery=_int(r.get('has_online_delivery')),
                has_table_booking=_int(r.get('has_table_booking')),
                featured_image=r.get('featured_image', ''),
                zomato_url=r.get('url', ''),
                currency=r.get('currency', ''),
            )
            db.merge(rec)
            inserted += 1

    db.commit()
    db.close()
    print(f"Done — {inserted} restaurants inserted, {skipped} skipped.")


def _float(val):
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _int(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


if __name__ == '__main__':
    load()
