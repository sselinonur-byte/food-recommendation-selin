# Food Recommendation System
### A Machine Learning Approach to Restaurant Discovery

---

## Slide 1 — Problem & Solution

### The Problem
Opening any food app surfaces the same top-rated list for everyone.
Real users have distinct tastes — a sushi lover and a BBQ enthusiast shouldn't see identical results.

### What We Built
A full-stack web app that offers two modes on the same dataset of **67,762 real Yelp restaurants**:

| Mode | What it does |
|---|---|
| **Browse** | Search and filter restaurants by city, cuisine, price, rating, delivery |
| **Personalized ✦** | ML model predicts which restaurants *you specifically* would rate highly |

Switching between modes is a single toggle click. Both share the same database and backend.

---

## Slide 2 — Features

### Browse Mode
- Free-text search across name and categories
- Filter by **city** (1,011 cities), **cuisine** (119+ types), **min rating**, **max budget**, **delivery**, **table booking**
- Paginated grid — 20 results per page, Load More
- Skeleton loading states, empty state UI

### Personalized Mode
- Enter a Yelp user ID → SVD model ranks restaurants by predicted personal rating
- Inline filter bar on top of ML results: city, cuisine, price range, delivery, open now
- Results update instantly on every filter change
- **Taste profile strip** — shows your top categories based on past high ratings
- **"Because you love" reason pills** — each card shows why it was recommended (e.g. `Pizza` · `Italian`)
- Graceful fallback for users not in training data

### Restaurant Detail Page
- Full info: address, price range, delivery/booking badges, link to Yelp
- **Similar restaurants** — horizontal strip powered by a separate content-based engine

---

## Slide 3 — Tech Stack

```
┌─────────────────────────────────────────────────┐
│  FRONTEND                                        │
│  React 18  ·  Vite 5  ·  Tailwind CSS  ·  Axios │
│  React Router v6  ·  React Context              │
├─────────────────────────────────────────────────┤
│  BACKEND                                         │
│  FastAPI  ·  Uvicorn  ·  SQLAlchemy ORM          │
│  Pydantic  ·  Python 3.9                        │
├─────────────────────────────────────────────────┤
│  DATABASE                                        │
│  SQLite  (2 tables: restaurants + reviews)       │
├─────────────────────────────────────────────────┤
│  MACHINE LEARNING                                │
│  scikit-learn  — TF-IDF + Cosine Similarity     │
│  scikit-surprise — SVD Matrix Factorization     │
│  pandas  ·  NumPy                               │
└─────────────────────────────────────────────────┘
```

**Data flows:** React → Axios → FastAPI → SQLite + ML engines → JSON response → rendered UI

**Dev setup:** Vite proxies all `/api` calls to FastAPI on port 8000 — no CORS config needed.

---

## Slide 4 — The Data

**Source:** Yelp Academic Dataset (publicly available for research)

| File | Records | Used for |
|---|---|---|
| `yelp_academic_dataset_business.json` | 150,346 businesses → **67,762 restaurants** | Restaurant catalogue |
| `yelp_academic_dataset_review.json` | 6.99M reviews → **5,257,990 restaurant reviews** | ML training data |
| `yelp_academic_dataset_tip.json` | 908,915 tips | Future implicit signal |
| `yelp_academic_dataset_checkin.json` | 131,930 check-ins | Future time-based signals |

### Key fields used

| Field | Used by |
|---|---|
| `categories` (e.g. "Pizza, Italian, Restaurants") | TF-IDF engine + explainability |
| `city`, `state`, `price_range` | TF-IDF engine + filters |
| `stars` (1–5), `is_open`, `review_count` | Browse filters + CF training |
| `user_id` + `business_id` + `stars` | SVD collaborative filtering |

Data is loaded by running `yelp_loader.py` once — streams the 5 GB review file line-by-line in batches of 10,000, inserting via raw SQL for speed.

---

## Slide 5 — Engine 1: Content-Based Filtering (TF-IDF)

**Used for:** "Similar restaurants" on each restaurant detail page.

### The idea
Represent every restaurant as a string of words, find the restaurants whose strings are most similar.

### How it works

**Step 1 — Feature string per restaurant**
```
"Pizza Italian Restaurants Philadelphia PA price_2"
     ↑ categories                    ↑city ↑state ↑price
```

**Step 2 — TF-IDF Vectorization**
- *TF (Term Frequency):* how often a word appears in this restaurant's string
- *IDF (Inverse Document Frequency):* how rare that word is across all 67k restaurants
- "Restaurants" → low weight (appears everywhere)
- "Ethiopian" → high weight (appears rarely)

Result: a sparse numeric vector per restaurant.

**Step 3 — Cosine Similarity (on-demand)**
```
similarity(q, c) = (q · c) / (|q| × |c|)     range: 0 → 1
```
Computed per request — one sparse matrix-vector multiply against all 67k restaurants.
Pre-computing a full matrix would require **67k × 67k × 4 bytes ≈ 18 GB RAM**.

---

## Slide 6 — Engine 2: Collaborative Filtering (SVD)

**Used for:** "Personalized for you" — the core ML feature.

### The idea
Users who agreed on ratings in the past will likely agree in the future.
*No restaurant features used — pure taste signal from rating patterns.*

### The User-Item Matrix
```
             Pizza Palace   Sushi Den   Taco Town   ...
Alice              5            —           4          ← 0.07% filled
Bob                —            5           —
Charlie            4            4           —
```
**Goal:** fill in the blanks as accurately as possible.

### SVD: Matrix Factorization
Decompose the sparse rating matrix **R** into two dense matrices:
```
R ≈ P × Qᵀ
P: every user  → 50 latent taste factors
Q: every restaurant → 50 latent style factors
```
**Prediction formula:**
```
rating(user, restaurant) = μ + bias_user + bias_restaurant + P_user · Q_restaurant
```
| Term | Meaning |
|---|---|
| `μ` | Global average rating |
| `bias_user` | Does this user rate higher/lower than average? |
| `bias_restaurant` | Is this restaurant rated higher/lower than average? |
| `P · Q` | Personal taste alignment |

**Training:** Stochastic Gradient Descent over 20 epochs, minimising squared error + L2 regularisation.

| Parameter | Value |
|---|---|
| Reviews used | 3,879,811 (filtered: users ≥ 3, restaurants ≥ 5) |
| Latent factors | 50 |
| Training time | ~156 minutes (one-time, saved to `cf_model.pkl`) |

**At request time:** one NumPy matrix multiply scores all 67k restaurants in ~10ms → top 500 candidates → SQL filters applied → top 10 returned.

**Cold start:** users not in training data get top-rated restaurants by vote count as a fallback.

---

## Slide 7 — Explainability & Summary

### Why Recommended? — Making the Model Trustworthy

SVD latent factors are uninterpretable numbers. We layer a human-readable explanation on top using the user's own review history:

```
Step 1  Find all restaurants this user rated ≥ 4 stars
Step 2  Count category frequency across those restaurants
        → Pizza: 47,  Coffee & Tea: 28,  American (New): 22 ...
Step 3  Remove generic terms ("Restaurants", "Food", "Nightlife")
Step 4  For each recommended restaurant, match its categories
        against the user's ranked list
Step 5  Show top 3 matches as orange pills on the card
```

**What the user sees:**

- **Taste profile strip:** `Sandwiches · Coffee & Tea · American (New) · Bars · Pizza`
- **Per-card reasons:** `[Pizza]` `[Italian]` under the restaurant name

No ML jargon. Grounded in real behaviour. Honest — no match means no pill shown.

---

### Summary

| | TF-IDF (Content-Based) | SVD (Collaborative) |
|---|---|---|
| **Input** | Restaurant categories + location + price | User star ratings |
| **Output** | Similar restaurants | Predicted personal rating |
| **Feature** | Detail page → Similar strip | Home → Personalized mode |
| **Training data** | None — computed at startup | 3.88M filtered reviews |
| **Personalised** | No | Yes |
| **Explainable** | N/A | Yes — reason pills from review history |

**Stack:** React + Vite + Tailwind → FastAPI + SQLite → scikit-learn + scikit-surprise

**Scale:** 67,762 restaurants · 5.2M reviews · 50 latent factors · 20 epochs · 156 min training
