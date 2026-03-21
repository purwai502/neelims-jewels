from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
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


def run_migrations():
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(14,4)"
            ))
            conn.execute(text(
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id)"
            ))
            conn.execute(text(
                "ALTER TABLE users ALTER COLUMN email DROP NOT NULL"
            ))
            conn.commit()
    except Exception as e:
        print(f"[migration] skipped: {e}")


Base.metadata.create_all(bind=engine)
run_migrations()

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

