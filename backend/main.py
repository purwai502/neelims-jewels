from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routers import (
    auth_router,
    users_router,
    gold_rates_router,
    clients_router,
    vendors_router,
    orders_router,
    products_router,
    transactions_router,
    payments_router,
    buybacks_router,
    staff_router,
    reports_router,
    accounts_router
)
import models  # ensures all models are registered with Base before create_all
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Neelima Jwels API")
os.makedirs("uploads/products", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS — reads allowed origins from env var (comma-separated), falls back to localhost for dev
ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register all routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(gold_rates_router)
app.include_router(clients_router)
app.include_router(vendors_router)
app.include_router(orders_router)
app.include_router(products_router)
app.include_router(transactions_router)
app.include_router(payments_router)
app.include_router(buybacks_router)
app.include_router(accounts_router)
app.include_router(staff_router)
app.include_router(reports_router)
@app.get("/")
def root():
    return {"status": "Neelima Jwels API is running"}

