# Food Recommendation System — Implementation Summary

---

## Data Sources

### Yelp Academic Dataset (primary — loaded into SQLite)

| File | Size | Records | Purpose |
|---|---|---|---|
| `yelp_academic_dataset_business.json` | 113 MB | 150,346 businesses → **67,762 food/restaurants** | Restaurant catalogue |
| `yelp_academic_dataset_review.json` | 5.0 GB | 6,990,280 total → **5,257,990 restaurant reviews** | User-item ratings for CF model |
| `yelp_academic_dataset_tip.json` | 172 MB | 908,915 tips | Available for future implicit signal |
| `yelp_academic_dataset_checkin.json` | 274 MB | 131,930 businesses | Available for future time-based signals |

### Zomato API Data (original prototype — replaced by Yelp)
- `data/file1.json` — 1,180 restaurants across 76 cities (India + international)

---

## Data Storage

**SQLite** (`backend/restaurants.db`)

Two tables — loaded by running `yelp_loader.py` once. Uses raw SQL `executemany` in batches of 10,000 for review inserts (4M+ rows would be too slow through the ORM).

### `restaurants` table — 67,762 rows

| Column | Type | Source |
|---|---|---|
| `id` | TEXT PK | `business_id` |
| `name` | TEXT | `name` |
| `cuisines` | TEXT | `categories` (e.g. `"Pizza, Italian, Restaurants"`) |
| `city` | TEXT | `city` |
| `state` | TEXT | `state` |
| `locality` | TEXT | `address` |
| `address` | TEXT | full formatted address |
| `latitude / longitude` | REAL | `latitude / longitude` |
| `average_cost_for_two` | INTEGER | mapped from `attributes.RestaurantsPriceRange2` (1→$15, 2→$35, 3→$70, 4→$120) |
| `price_range` | INTEGER | `attributes.RestaurantsPriceRange2` (1–4) |
| `aggregate_rating` | REAL | `stars` (1.0–5.0) |
| `votes` | INTEGER | `review_count` |
| `rating_text` | TEXT | derived from stars (Excellent / Very Good / Good / Average / Poor) |
| `has_online_delivery` | INTEGER | `attributes.RestaurantsDelivery` (0/1) |
| `has_table_booking` | INTEGER | `attributes.RestaurantsReservations` (0/1) |
| `is_open` | INTEGER | `is_open` (0/1) |
| `featured_image` | TEXT | empty (Yelp academic dataset has no image URLs) |
| `currency` | TEXT | `$` |

### `reviews` table — 5,257,990 rows

| Column | Type | Source |
|---|---|---|
| `review_id` | TEXT PK | `review_id` |
| `user_id` | TEXT (indexed) | `user_id` |
| `business_id` | TEXT (indexed) | `business_id` |
| `stars` | REAL | `stars` (1.0–5.0 explicit rating) |
| `date` | TEXT | `date` |
| `useful / funny / cool` | INTEGER | social vote counts |

### In-memory at runtime
- **TF-IDF sparse matrix** — 67,762 × vocab_size, built at FastAPI startup for content-based similarity
- **SVD model** — loaded from `cf_model.pkl` at startup; holds latent factor matrices for all users and items

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18.3 |
| Build tool | Vite | 5.2 |
| Styling | Tailwind CSS | 3.4 |
| Routing | React Router | v6 |
| HTTP client | Axios | 1.7 |
| Backend | FastAPI | 0.111 |
| Server | Uvicorn | 0.29 |
| ORM | SQLAlchemy | 2.0 |
| Validation | Pydantic | 2.7 |
| Content-based engine | scikit-learn (TF-IDF + cosine similarity) | 1.4 |
| Collaborative filtering | scikit-surprise (SVD) | 1.1.4 |
| Data processing | pandas | 2.x |
| Database | SQLite | (built-in) |
| Runtime | Python | 3.9 |
| Runtime | Node.js | 24 |

---

## Recommendation Engines

### 1. Content-Based — TF-IDF + Cosine Similarity
Used for **"Similar restaurants"** on the detail page.

- Feature string per restaurant: `"{categories} {city} {state} price_{price_range}"`
- All 67,762 restaurants vectorized into a TF-IDF sparse matrix at startup
- On request: one sparse matrix-vector multiply to compute cosine similarity of the target restaurant against all others — returns top-N
- On-demand computation (no pre-computed matrix) — 67k×67k would require ~18 GB RAM

### 2. Collaborative Filtering — SVD (Matrix Factorization)
Used for **"Personalized for you"** on the home page.

```
Training data:  5,257,990 restaurant reviews
After filtering (users ≥ 3 reviews, businesses ≥ 5 reviews):  3,879,811 reviews
Algorithm:      SVD (Singular Value Decomposition) via scikit-surprise
Hyperparameters: n_factors=50, n_epochs=20, lr=0.005, reg=0.02
Training time:  ~156 minutes (one-time, saved to cf_model.pkl)
```

**Prediction (vectorized):**
```
score[i] = global_mean + bias[user] + bias[item] + pu[user] · qi[item]
```
All item scores computed in a single matrix multiply (`qi @ pu[user]`), making per-user prediction sub-second across 67k candidates.

**Hybrid logic:**
- Known user (in training set) → SVD predictions, filtered and re-ranked
- Unknown user → top-rated restaurants by vote count

---

## Features Implemented

### View Modes (Home page toggle)
- **Browse all** — full search + filter panel + paginated restaurant grid
- **Personalized ✦** — SVD recommendations with inline filter controls
- Pill toggle switches between modes; only one view shown at a time

### Browse Mode — Search & Filtering
- Free-text search across restaurant name and categories
- Filter by city (1,011 cities)
- Filter by cuisine type (119+ unique cuisines)
- Minimum rating filter
- Maximum budget filter (cost for two)
- Toggle: online delivery only
- Toggle: table booking only
- All filters combine — results update live
- Paginated grid — 20 per page, "Load More" appends
- Results sorted by rating descending
- Skeleton loading cards, empty state UI

### Personalized Mode — SVD + Filters + Explainability
- Enter any Yelp user ID or select from sample heavy-reviewers
- SVD model pulls **500 CF-ranked candidates** for that user
- Inline filter bar applies on top of those candidates:
  - City, cuisine, price range ($ / $$ / $$$ / $$$$)
  - Min rating, max cost for two
  - Delivery, table booking, open now toggles
- Results re-sorted by CF score after filtering
- Header shows candidate pool size → how many survived filters
- Filters re-fetch immediately on change (no submit needed)
- Falls back to top-rated restaurants for unknown users
- **Taste profile strip** — shows the user's top categories (rated ≥ 4 stars) across all reviews
- **"Because you love" reasons** — each card shows orange pills with the matching categories that drove the recommendation (e.g. `Pizza` · `Italian`)

### Explainability — How Reasons Are Computed
1. Query all reviews where `user_id = X` and `stars ≥ 4.0`
2. Fetch categories of those highly-rated restaurants
3. Count category frequency, exclude generic terms (`Restaurants`, `Food`, `Nightlife`, etc.)
4. For each recommended restaurant, intersect its categories with the user's top-ranked categories
5. Return the top 3 matching categories as `reasons` — ordered by how frequently the user has rewarded that category

This gives a human-readable explanation grounded in actual review behaviour, not model internals.

### Restaurant Cards
- Featured image with placeholder fallback
- Color-coded rating badge (Excellent → green, Average → orange, Poor → red)
- Categories, locality + city, cost for two, delivery/booking icons
- **Orange reason pills** when shown in Personalized mode (e.g. `Pizza` · `Italian`)

### Restaurant Detail Page
- Hero image, name, rating + vote count
- Full address, price range label, cost badge
- Delivery + table booking badges
- Link out to Yelp
- **Similar restaurants** — horizontal scroll strip powered by TF-IDF cosine similarity

---

## API Routes

| Route | What it does |
|---|---|
| `GET /api/restaurants` | Search + filter with pagination (`q`, `city`, `cuisine`, `min_rating`, `max_cost`, `delivery`, `booking`, `page`, `limit`) |
| `GET /api/restaurants/{id}` | Single restaurant detail |
| `GET /api/restaurants/{id}/similar?n=10` | TF-IDF content-based similar restaurants |
| `GET /api/cities` | Sorted list of all 1,011 cities |
| `GET /api/cuisines` | Sorted list of all cuisine types |
| `GET /api/recommendations` | SVD personalized recommendations (`user_id`, `n`, `city`, `cuisine`, `min_rating`, `max_cost`, `price_range`, `delivery`, `booking`, `open_only`) |
| `GET /api/recommendations/sample-users` | Top 20 reviewers from training set (for demo) |

---

## Key Scripts

| Script | What it does | Run once? |
|---|---|---|
| `yelp_loader.py` | Loads 67k businesses + 5.2M reviews from Yelp JSON into SQLite | Yes |
| `train_cf.py` | Trains SVD model on review data, saves `cf_model.pkl` | Yes (~156 min) |
| `data_loader.py` | Original Zomato loader (superseded by yelp_loader) | — |

---

## Frontend Architecture

- `FilterContext` — global React Context for browse-mode filter state, results, pagination, loading/error
- `PersonalizedSection` — self-contained component with its own user ID + filter state
- Vite proxy — `/api` → `localhost:8000`, no CORS issues in dev
- React Router v6 — `/` (home) and `/restaurant/:id` (detail)
