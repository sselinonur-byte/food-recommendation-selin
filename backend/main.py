from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, SessionLocal
from models import Base, Restaurant
import recommender
import cf_model
from routers import restaurants, cities, cuisines, recommendations


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        all_restaurants = db.query(Restaurant).all()
        db.close()

        recommender.build(all_restaurants)
        print(f"TF-IDF matrix built for {len(all_restaurants)} restaurants")

        if cf_model.load():
            print("CF model loaded")
        else:
            print("CF model not found")

    except Exception as e:
        print("Startup error:", e)

    yield


app = FastAPI(title="Food Recommendation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # IMPORTANT for Cloud Run
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router)
app.include_router(cities.router)
app.include_router(cuisines.router)
app.include_router(recommendations.router)
