"""
Run once: python yelp_loader.py
Loads Yelp businesses (restaurants only) + reviews into restaurants.db.
Replaces any existing data.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base, Restaurant, Review

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, '..', 'data')

BUSINESS_FILE = os.path.join(DATA, 'yelp_academic_dataset_business.json')
REVIEW_FILE   = os.path.join(DATA, 'yelp_academic_dataset_review.json')
TIP_FILE      = os.path.join(DATA, 'yelp_academic_dataset_tip.json')

FOOD_KEYWORDS = {
    'Restaurants', 'Food', 'Bars', 'Fast Food', 'Pizza', 'Coffee & Tea',
    'Bakeries', 'Cafes', 'Desserts', 'Nightlife', 'Sandwiches', 'Burgers',
    'Sushi Bars', 'Chinese', 'Mexican', 'Italian', 'Japanese', 'Thai',
    'Indian', 'Mediterranean', 'American', 'Steakhouses', 'Seafood',
}

COST_MAP = {1: 15, 2: 35, 3: 70, 4: 120}


def rating_text(stars):
    if stars >= 4.5: return 'Excellent'
    if stars >= 4.0: return 'Very Good'
    if stars >= 3.5: return 'Good'
    if stars >= 2.5: return 'Average'
    return 'Poor'


def attr_bool(attrs, key):
    v = attrs.get(key, 'False')
    return 1 if str(v).lower() in ("true", "'true'") else 0


def attr_int(attrs, key, default=None):
    v = attrs.get(key)
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def load_businesses():
    print('Loading businesses...')
    db = SessionLocal()
    restaurant_ids = set()
    batch = []
    total = 0

    with open(BUSINESS_FILE, encoding='utf-8') as f:
        for line in f:
            b = json.loads(line)
            cats = b.get('categories') or ''
            if not any(kw in cats for kw in FOOD_KEYWORDS):
                continue

            attrs = b.get('attributes') or {}
            price_range = attr_int(attrs, 'RestaurantsPriceRange2')
            stars = float(b.get('stars') or 0)

            r = Restaurant(
                id=b['business_id'],
                name=b.get('name', ''),
                cuisines=cats,
                city=b.get('city', ''),
                state=b.get('state', ''),
                locality=b.get('address', ''),
                address=f"{b.get('address','')}, {b.get('city','')}, {b.get('state','')} {b.get('postal_code','')}".strip(', '),
                latitude=b.get('latitude'),
                longitude=b.get('longitude'),
                average_cost_for_two=COST_MAP.get(price_range),
                price_range=price_range,
                aggregate_rating=stars,
                votes=int(b.get('review_count') or 0),
                rating_text=rating_text(stars),
                has_online_delivery=attr_bool(attrs, 'RestaurantsDelivery'),
                has_table_booking=attr_bool(attrs, 'RestaurantsReservations'),
                is_open=int(b.get('is_open') or 0),
                featured_image='',
                zomato_url='',
                currency='$',
            )
            batch.append(r)
            restaurant_ids.add(b['business_id'])
            total += 1

            if len(batch) >= 2000:
                for item in batch:
                    db.merge(item)
                db.commit()
                batch = []
                print(f'\r  {total:,} restaurants loaded...', end='', flush=True)

    for item in batch:
        db.merge(item)
    db.commit()
    db.close()
    print(f'\r  Done — {total:,} restaurants loaded.')
    return restaurant_ids


def load_reviews(restaurant_ids):
    print('Loading reviews (streaming 5GB file — this will take several minutes)...')
    conn = engine.raw_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reviews")
    conn.commit()

    batch = []
    total = skipped = 0
    t0 = time.time()

    with open(REVIEW_FILE, encoding='utf-8') as f:
        for line in f:
            r = json.loads(line)
            if r['business_id'] not in restaurant_ids:
                skipped += 1
                continue

            batch.append((
                r['review_id'],
                r['user_id'],
                r['business_id'],
                float(r['stars']),
                r.get('date', ''),
                int(r.get('useful') or 0),
                int(r.get('funny') or 0),
                int(r.get('cool') or 0),
            ))
            total += 1

            if len(batch) >= 10000:
                cursor.executemany(
                    "INSERT OR IGNORE INTO reviews "
                    "(review_id, user_id, business_id, stars, date, useful, funny, cool) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    batch
                )
                conn.commit()
                batch = []
                elapsed = time.time() - t0
                print(f'\r  {total:,} reviews loaded ({elapsed:.0f}s)...', end='', flush=True)

    if batch:
        cursor.executemany(
            "INSERT OR IGNORE INTO reviews "
            "(review_id, user_id, business_id, stars, date, useful, funny, cool) "
            "VALUES (?,?,?,?,?,?,?,?)",
            batch
        )
        conn.commit()

    conn.close()
    elapsed = time.time() - t0
    print(f'\r  Done — {total:,} restaurant reviews loaded in {elapsed:.0f}s ({skipped:,} non-restaurant skipped).')
    return total


def save_sample_users():
    """Find top reviewers to use as demo user IDs in the frontend."""
    print('Finding top reviewers for demo...')
    conn = engine.raw_connection()
    cursor = conn.cursor()
    rows = cursor.execute(
        "SELECT user_id, COUNT(*) as n FROM reviews GROUP BY user_id ORDER BY n DESC LIMIT 20"
    ).fetchall()
    conn.close()

    import json as _json
    out_path = os.path.join(BASE, 'sample_users.json')
    users = [{'user_id': r[0], 'review_count': r[1]} for r in rows]
    with open(out_path, 'w') as f:
        _json.dump(users, f, indent=2)
    print(f'  Saved {len(users)} sample users to sample_users.json')


if __name__ == '__main__':
    print('Rebuilding database from Yelp data...')
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    restaurant_ids = load_businesses()
    load_reviews(restaurant_ids)
    save_sample_users()

    print('\nAll done. Next step: python train_cf.py')
