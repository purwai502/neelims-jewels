from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from routers.users import require_manager_or_above
from models.user import User
from models.product import Product
from models.product_stone import ProductStone
from models.purity import Purity
from services.gold_service import apply_live_valuation

router = APIRouter(prefix="/reports", tags=["Reports"])


def rows_to_dicts(rows):
    if not rows:
        return []
    return [dict(r._mapping) for r in rows]


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    row = db.execute(text("""
        SELECT
            COALESCE(SUM(p.amount), 0)::float            AS total_revenue,
            COUNT(DISTINCT o.id)                         AS total_orders,
            CASE WHEN COUNT(DISTINCT o.id) = 0 THEN 0
                 ELSE (COALESCE(SUM(p.amount), 0) / COUNT(DISTINCT o.id))::float
            END                                          AS avg_order_value,
            COUNT(DISTINCT c.id)                         AS total_clients,
            COALESCE(SUM(CASE WHEN p.payment_method = 'GOLD_EXCHANGE'
                              THEN p.amount ELSE 0 END), 0)::float AS total_gold_exchange,
            COALESCE(SUM(pr.making_charges), 0)::float   AS total_making_charges,
            COALESCE(SUM(o.final_price) - SUM(p.amount), 0)::float AS total_outstanding,
            COALESCE((SELECT SUM(cost_price) FROM products WHERE is_sold = true AND cost_price IS NOT NULL), 0)::float AS total_cost,
            (COALESCE(SUM(p.amount), 0) - COALESCE((SELECT SUM(cost_price) FROM products WHERE is_sold = true AND cost_price IS NOT NULL), 0))::float AS gross_profit
        FROM clients c
        LEFT JOIN orders   o  ON o.client_id = c.id
        LEFT JOIN payments p  ON p.order_id  = o.id
        LEFT JOIN products pr ON pr.order_id = o.id
    """)).fetchone()
    return dict(row._mapping) if row else {}


@router.get("/revenue-by-month")
def revenue_by_month(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', p.created_at), 'Mon YYYY') AS label,
            DATE_TRUNC('month', p.created_at)                       AS sort_key,
            COALESCE(SUM(p.amount), 0)::float                       AS total
        FROM payments p
        GROUP BY DATE_TRUNC('month', p.created_at)
        ORDER BY sort_key
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/orders-by-month")
def orders_by_month(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            TO_CHAR(TO_DATE(EXTRACT(MONTH FROM created_at)::text, 'MM'), 'Mon') AS month,
            EXTRACT(MONTH FROM created_at)::int                                  AS month_num,
            COUNT(*)                                                              AS count
        FROM orders
        GROUP BY EXTRACT(MONTH FROM created_at)
        ORDER BY month_num
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/payment-methods")
def payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            payment_method                AS method,
            COUNT(*)                      AS count,
            COALESCE(SUM(amount), 0)::float AS total
        FROM payments
        GROUP BY payment_method
        ORDER BY total DESC
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/top-clients")
def top_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            c.id,
            c.full_name,
            c.phone,
            COUNT(DISTINCT o.id)              AS order_count,
            COALESCE(SUM(p.amount), 0)::float AS total_paid,
            MAX(p.created_at)                 AS last_payment
        FROM clients c
        JOIN accounts a  ON c.account_id = a.id
        LEFT JOIN orders   o ON o.client_id  = c.id
        LEFT JOIN payments p ON p.account_id = a.id
        GROUP BY c.id
        ORDER BY total_paid DESC
        LIMIT 20
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/outstanding-balances")
def outstanding_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            o.id                                                          AS order_id,
            c.full_name,
            c.phone,
            COALESCE(o.final_price, 0)::float                            AS final_price,
            COALESCE(SUM(p.amount), 0)::float                            AS total_paid,
            (COALESCE(o.final_price, 0) - COALESCE(SUM(p.amount), 0))::float AS outstanding
        FROM orders o
        LEFT JOIN clients  c ON o.client_id = c.id
        LEFT JOIN payments p ON p.order_id  = o.id
        GROUP BY o.id, c.full_name, c.phone, o.final_price
        HAVING COALESCE(o.final_price, 0) - COALESCE(SUM(p.amount), 0) > 0.01
        ORDER BY outstanding DESC
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/metal-breakdown")
def metal_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    # Loaded via the ORM (not raw SQL) so unsold products can be marked to
    # market with today's gold rate before being summed — same rule used
    # everywhere else: sold products keep their frozen sale-time price,
    # unsold products track the live rate, so this report always matches
    # what a client's invoice would show for that piece right now.
    products = db.query(Product).all()
    stones_by_product: dict = {}
    for s in db.query(ProductStone).all():
        stones_by_product.setdefault(str(s.product_id), []).append(s)
    purity_names = {p.code: p.display_name for p in db.query(Purity).all()}

    breakdown: dict = {}
    for product in products:
        product.stones = stones_by_product.get(str(product.id), [])
        apply_live_valuation(product, db)

        metal_type = purity_names.get(product.purity)
        acc = breakdown.setdefault(metal_type, {
            "metal_type": metal_type, "count": 0,
            "total_weight": 0.0, "total_value": 0.0, "total_making_charges": 0.0,
        })
        acc["count"] += 1
        acc["total_weight"] += float(product.weight or 0)
        acc["total_value"] += float(product.total_price or 0)
        acc["total_making_charges"] += float(product.making_charges or 0)

    result = []
    for acc in breakdown.values():
        acc["avg_making_pct"] = (
            round(acc["total_making_charges"] / acc["total_value"] * 100, 1)
            if acc["total_value"] else 0
        )
        result.append(acc)

    result.sort(key=lambda r: r["total_value"], reverse=True)
    return result


@router.get("/gold-exchange-summary")
def gold_exchange_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', p.created_at), 'Mon YYYY') AS label,
            DATE_TRUNC('month', p.created_at)                       AS sort_key,
            COALESCE(SUM(p.amount), 0)::float                       AS total_value
        FROM payments p
        WHERE p.payment_method = 'GOLD_EXCHANGE'
        GROUP BY DATE_TRUNC('month', p.created_at)
        ORDER BY sort_key
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/inactive-clients")
def inactive_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            c.id,
            c.full_name,
            c.phone,
            COUNT(DISTINCT o.id)              AS total_orders,
            COALESCE(SUM(p.amount), 0)::float AS lifetime_value,
            MAX(p.created_at)                 AS last_payment,
            EXTRACT(DAY FROM NOW() - MAX(p.created_at))::int AS days_since_payment
        FROM clients c
        JOIN accounts a  ON c.account_id = a.id
        LEFT JOIN orders   o ON o.client_id  = c.id
        LEFT JOIN payments p ON p.account_id = a.id
        GROUP BY c.id
        HAVING MAX(p.created_at) < NOW() - INTERVAL '90 days'
            OR MAX(p.created_at) IS NULL
        ORDER BY days_since_payment DESC NULLS LAST
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/profit-by-month")
def profit_by_month(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    rows = db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', pay.created_at), 'Mon YYYY') AS label,
            DATE_TRUNC('month', pay.created_at)                       AS sort_key,
            COALESCE(SUM(pay.amount), 0)::float                       AS revenue,
            COALESCE((
                SELECT SUM(pr2.cost_price)
                FROM products pr2
                WHERE pr2.is_sold = true
                  AND pr2.cost_price IS NOT NULL
                  AND DATE_TRUNC('month', pr2.created_at) = DATE_TRUNC('month', pay.created_at)
            ), 0)::float AS cost,
            (COALESCE(SUM(pay.amount), 0) - COALESCE((
                SELECT SUM(pr2.cost_price)
                FROM products pr2
                WHERE pr2.is_sold = true
                  AND pr2.cost_price IS NOT NULL
                  AND DATE_TRUNC('month', pr2.created_at) = DATE_TRUNC('month', pay.created_at)
            ), 0))::float AS profit
        FROM payments pay
        GROUP BY DATE_TRUNC('month', pay.created_at)
        ORDER BY sort_key
    """)).fetchall()
    return rows_to_dicts(rows)


@router.get("/export/all")
def export_all_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above),
):
    clients_data = db.execute(text("""
        SELECT c.id, c.full_name, c.phone, c.email, c.address, c.notes,
               c.created_at,
               COALESCE(SUM(p.amount), 0)::float AS total_paid,
               COUNT(DISTINCT o.id) AS total_orders
        FROM clients c
        JOIN accounts a ON c.account_id = a.id
        LEFT JOIN payments p ON p.account_id = a.id
        LEFT JOIN orders o ON o.client_id = c.id
        GROUP BY c.id
        ORDER BY total_paid DESC
    """)).fetchall()

    orders_data = db.execute(text("""
        SELECT o.id, o.status, o.notes, o.final_price::float,
               c.full_name AS client_name, c.phone AS client_phone,
               o.created_at, o.locked_at,
               COALESCE(SUM(p.amount), 0)::float AS total_paid,
               (COALESCE(o.final_price, 0) - COALESCE(SUM(p.amount), 0))::float AS outstanding
        FROM orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN payments p ON p.order_id = o.id
        GROUP BY o.id, c.full_name, c.phone
        ORDER BY o.created_at DESC
    """)).fetchall()

    products_data = db.execute(text("""
        SELECT p.id, p.barcode, p.description, p.weight::float,
               pu.display_name AS purity, p.making_charges::float,
               p.gold_rate_snapshot::float, p.total_price::float,
               p.cost_price::float, p.vendor_id,
               o.notes AS order_notes, p.created_at
        FROM products p
        LEFT JOIN purities pu ON p.purity = pu.code
        LEFT JOIN orders o ON p.order_id = o.id
        ORDER BY p.created_at DESC
    """)).fetchall()

    payments_data = db.execute(text("""
        SELECT p.id, p.payment_method, p.amount::float,
               p.notes, c.full_name AS client_name,
               c.phone AS client_phone, p.created_at
        FROM payments p
        JOIN accounts a ON p.account_id = a.id
        LEFT JOIN clients c ON c.account_id = a.id
        ORDER BY p.created_at DESC
    """)).fetchall()

    transactions_data = db.execute(text("""
        SELECT t.id, t.reference_type, t.amount::float,
               t.gold_weight::float, t.gold_purity, t.gold_rate_snapshot::float,
               t.notes, t.date,
               da.name AS debit_account, ca.name AS credit_account
        FROM transactions t
        JOIN accounts da ON t.debit_account_id  = da.id
        JOIN accounts ca ON t.credit_account_id = ca.id
        ORDER BY t.date DESC
    """)).fetchall()

    gold_rates_data = db.execute(text("""
        SELECT effective_date, price_per_gram_24k::float, created_at
        FROM gold_rates
        ORDER BY effective_date DESC
    """)).fetchall()

    return {
        "clients":      rows_to_dicts(clients_data),
        "orders":       rows_to_dicts(orders_data),
        "products":     rows_to_dicts(products_data),
        "payments":     rows_to_dicts(payments_data),
        "transactions": rows_to_dicts(transactions_data),
        "gold_rates":   rows_to_dicts(gold_rates_data),
    }
