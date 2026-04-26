# Food Recommendation System — Implementation Plan

## Overview

A web application that recommends restaurants based on user preferences using content-based filtering on real Zomato data (1,180 restaurants across 76 cities globally).

---

## Problem Statement

Users face decision fatigue when choosing restaurants. Most platforms rely on generic ratings without personalization. This system provides tailored recommendations based on user-specified preferences (cuisine, location, budget, delivery availability) and surfaces similar restaurants using a TF-IDF content-based engine.

---

## Dataset

- **Source:** Zomato API data (`data/file1.json`)
- **Size:** 1,180 restaurants across 76 cities (India + international)
- **Key fields:**
  - `name` — Restaurant name
  - `cuisines` — Comma-separated cuisine types (119 unique)
  - `location.city` — City
  - `location.locality` — Neighbourhood
  - `average_cost_for_two` — Budget indicator
  - `price_range` — 1 (budget) to 4 (premium)
  - `user_rating.aggregate_rating` — Score 0–4.9
  - `user_rating.votes` — Vote count
  - `has_online_delivery` — 0 or 1
  - `has_table_booking` — 0 or 1
  - `featured_image` — Image URL

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | UI |
| Styling | Tailwind CSS | Utility-first styling |
| HTTP Client | Axios | API calls from React |
| Backend | FastAPI (Python 3.11) | REST API |
| Database | SQLite + SQLAlchemy | Data storage & queries |
| Recommendation | scikit-learn (TF-IDF + Cosine Similarity) | Similar restaurants |
| Data Loader | Python script | JSON → SQLite one-time import |

---

## Architecture

```
User Input (search query / filters)
        │
        ▼
  React Frontend (Vite, port 5173)
  - SearchPanel (city, cuisine, price, rating, delivery)
  - RestaurantGrid (cards with image, rating, cost)
  - RestaurantDetail (full info + similar restaurants)
        │  Axios HTTP
        ▼
  FastAPI Backend (port 8000)
  - GET /api/restaurants        ← search + filter
  - GET /api/restaurants/:id    ← single restaurant
  - GET /api/restaurants/:id/similar  ← recommendations
  - GET /api/cities
  - GET /api/cuisines
        │
        ▼
  SQLite Database (restaurants.db)
  + Recommendation Engine (TF-IDF in memory)
  ┌──────────────────────────────────────┐
  │  1. Feature string per restaurant    │
  │     "{cuisines} {city} price_{n}"    │
  │  2. TF-IDF vectorize all restaurants │
  │  3. Cosine similarity matrix         │
  │  4. Cache at startup                 │
  │  5. Top-N lookup on request          │
  └──────────────────────────────────────┘
        │
        ▼
  JSON Response → React renders results
```

---

## Project Structure

```
food-recommendation-system/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLite connection & session
│   ├── models.py                # SQLAlchemy ORM model
│   ├── schemas.py               # Pydantic response schemas
│   ├── routers/
│   │   ├── restaurants.py       # /restaurants routes
│   │   ├── cities.py            # /cities route
│   │   └── cuisines.py          # /cuisines route
│   ├── recommender.py           # TF-IDF engine
│   ├── data_loader.py           # JSON → SQLite importer
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchPanel.jsx        # Filters sidebar
│   │   │   ├── RestaurantCard.jsx     # Single card
│   │   │   ├── RestaurantGrid.jsx     # Card grid
│   │   │   ├── SimilarRestaurants.jsx # Similar section
│   │   │   ├── FilterBadges.jsx       # Active filter chips
│   │   │   ├── RatingBadge.jsx        # Star + score badge
│   │   │   └── EmptyState.jsx         # No results UI
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Search + browse
│   │   │   └── RestaurantDetail.jsx   # Detail + similar
│   │   ├── api/
│   │   │   └── index.js               # All Axios API calls
│   │   ├── context/
│   │   │   └── FilterContext.jsx      # Global filter state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── data/
│   └── file1.json
└── PLAN.md
```

---

## Database Schema (SQLite)

Single table — `restaurants`

```sql
CREATE TABLE restaurants (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    cuisines             TEXT,          -- "North Indian, Chinese"
    city                 TEXT,
    locality             TEXT,
    address              TEXT,
    latitude             REAL,
    longitude            REAL,
    average_cost_for_two INTEGER,
    price_range          INTEGER,       -- 1 to 4
    aggregate_rating     REAL,
    votes                INTEGER,
    rating_text          TEXT,
    has_online_delivery  INTEGER,       -- 0 or 1
    has_table_booking    INTEGER,       -- 0 or 1
    featured_image       TEXT,
    zomato_url           TEXT,
    currency             TEXT
);
```

---

## Backend API Routes

### `GET /api/restaurants`
Search and filter restaurants with optional query params.

| Param | Type | Description |
|---|---|---|
| `q` | string | Free text — searches name + cuisines |
| `city` | string | Filter by city |
| `cuisine` | string | Filter by cuisine type |
| `min_rating` | float | Minimum aggregate rating |
| `max_cost` | int | Maximum average cost for two |
| `delivery` | bool | Only show delivery-available restaurants |
| `booking` | bool | Only show table-booking restaurants |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 20) |

### `GET /api/restaurants/{id}`
Returns full details for a single restaurant.

### `GET /api/restaurants/{id}/similar?n=10`
Returns top-N similar restaurants using cosine similarity.

### `GET /api/cities`
Returns sorted list of all unique cities.

### `GET /api/cuisines`
Returns sorted list of all unique cuisine types.

---

## Recommendation Engine

**Algorithm: TF-IDF + Cosine Similarity**

```
Step 1  Build feature string per restaurant
        feature = "{cuisines} {city} price_{price_range}"
        e.g. "North Indian Chinese Mumbai price_2"

Step 2  TF-IDF vectorize all 1,180 feature strings
        → sparse matrix (1180 × vocab_size)

Step 3  Compute pairwise cosine similarity
        → 1180 × 1180 similarity matrix

Step 4  Cache matrix in memory at FastAPI startup

Step 5  On /similar/{id} request
        → look up row for that restaurant
        → sort by similarity score descending
        → return top-N (excluding itself)
```

**Libraries:** `sklearn.feature_extraction.text.TfidfVectorizer`, `sklearn.metrics.pairwise.cosine_similarity`

---

## Frontend Pages & Components

### Home Page (`/`)

```
┌─────────────────────────────────────────────────┐
│  🍽️  Food Finder                               │
│  "Find your next favourite restaurant"          │
├──────────────┬──────────────────────────────────┤
│  FILTERS     │  RESULTS  (340 restaurants)       │
│              │                                   │
│  City ▼      │  ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  Cuisine ▼   │  │card│ │card│ │card│ │card│   │
│  Price ────  │  └────┘ └────┘ └────┘ └────┘   │
│  Rating ★    │                                   │
│  □ Delivery  │  Showing 20 of 340 results        │
│  □ Booking   │  [Load More]                      │
└──────────────┴──────────────────────────────────┘
```

### Restaurant Detail Page (`/restaurant/:id`)

```
┌─────────────────────────────────────────────────┐
│  [Featured Image]                               │
│  Restaurant Name           ★ 4.3 (1200 votes)  │
│  North Indian · Chinese    💰 ₹800 for two      │
│  Hauz Khas, New Delhi      🛵 Delivery  📅 Book │
├─────────────────────────────────────────────────┤
│  SIMILAR RESTAURANTS                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  →        │
│  │    │ │    │ │    │ │    │ │    │           │
│  └────┘ └────┘ └────┘ └────┘ └────┘           │
└─────────────────────────────────────────────────┘
```

### Restaurant Card

```
┌──────────────────────┐
│  [Image]             │
│  ★ 4.3  Very Good   │
├──────────────────────┤
│  Hauz Khas Social    │
│  Continental · Asian │
│  Hauz Khas, Delhi    │
│  ₹1,600 for two      │
│  🛵 Delivery          │
└──────────────────────┘
```

---

## Frontend State (FilterContext)

```js
{
  query: "",           // free text search
  city: "",            // selected city
  cuisine: "",         // selected cuisine
  minRating: 0,        // 0 to 5
  maxCost: null,       // max budget filter
  delivery: false,     // has_online_delivery filter
  booking: false,      // has_table_booking filter
  page: 1,
  results: [],
  total: 0,
  loading: false,
  error: null
}
```

---

## API Calls (Axios — `api/index.js`)

```js
getRestaurants(filters)          → GET /api/restaurants?...
getRestaurantById(id)            → GET /api/restaurants/:id
getSimilarRestaurants(id, n=10)  → GET /api/restaurants/:id/similar
getCities()                      → GET /api/cities
getCuisines()                    → GET /api/cuisines
```

---

## Implementation Phases

| Phase | What to build | Files |
|---|---|---|
| **1** | Project setup — folders, dependencies, venv | `requirements.txt`, `package.json` |
| **2** | Data loader — JSON → SQLite | `data_loader.py`, `models.py`, `database.py` |
| **3** | FastAPI backend — routes + schemas | `main.py`, `routers/`, `schemas.py` |
| **4** | Recommendation engine (TF-IDF) | `recommender.py` |
| **5** | React setup + Axios API layer | `vite.config.js`, `api/index.js` |
| **6** | Filter state + SearchPanel | `FilterContext.jsx`, `SearchPanel.jsx` |
| **7** | RestaurantCard + Grid + Home page | `RestaurantCard.jsx`, `Home.jsx` |
| **8** | Restaurant Detail + Similar section | `RestaurantDetail.jsx`, `SimilarRestaurants.jsx` |
| **9** | Polish — loading, empty states, error handling | All components |

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Storage | SQLite | File-based, zero infra, fully queryable |
| Recommendation type | Content-based (TF-IDF) | No user data available |
| Pagination | Page-based (limit/offset) | Simple, fits dataset size |
| State management | React Context | Small dataset, no need for Redux |
| Routing | React Router v6 | Standard, lightweight |
| Styling | Tailwind CSS | Fast to build, consistent |
| CORS | FastAPI middleware | React (5173) ↔ FastAPI (8000) |

---

## Future Enhancements (when user data is available)

- **Collaborative Filtering** — user-item interaction matrix
- **Hybrid model** — content-based + collaborative signals
- **User profiles** — save preferences, search history
- **Location-based** — show restaurants near me (lat/long)
- **Real-time ratings** — write user reviews to DB
