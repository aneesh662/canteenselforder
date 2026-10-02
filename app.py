import os
import sqlite3
from functools import wraps
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request, session, redirect, url_for, flash
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB = BASE_DIR / "data" / "canteen.db"
DB_PATH = Path(os.getenv("DB_PATH", str(DEFAULT_DB)))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")

DEFAULT_PRODUCTS = [
    ("Dosa", 40, "Breakfast", "🥞", "05:00", "11:00", 1),
    ("Idli", 30, "Breakfast", "⚪", "05:00", "11:00", 1),
    ("Poori Masala", 45, "Breakfast", "🫓", "05:00", "11:00", 1),
    ("Appam", 35, "Breakfast", "🥞", "05:00", "11:00", 1),
    ("Meals", 80, "Lunch", "🍚", "11:00", "15:00", 1),
    ("Chicken Biriyani", 120, "Lunch", "🍗", "11:00", "15:00", 1),
    ("Veg Biriyani", 90, "Lunch", "🍛", "11:00", "15:00", 1),
    ("Chapati", 15, "Dinner", "🫓", "15:00", "22:00", 1),
    ("Parotta", 20, "Dinner", "🫓", "15:00", "22:00", 1),
    ("Chicken Curry", 100, "Dinner", "🍗", "15:00", "22:00", 1),
    ("Egg Curry", 60, "Dinner", "🥚", "15:00", "22:00", 1),
    ("Chicken Biriyani", 120, "Dinner", "🍗", "15:00", "22:00", 1),
    ("Tea", 10, "Drinks", "☕", "00:00", "23:59", 1),
    ("Coffee", 20, "Drinks", "☕", "00:00", "23:59", 1),
    ("Water Bottle", 15, "Drinks", "💧", "00:00", "23:59", 1),
    ("Juice", 40, "Drinks", "🧃", "00:00", "23:59", 1),
    ("Samosa", 15, "Snacks", "🥟", "00:00", "23:59", 1),
    ("Vada", 15, "Snacks", "🍩", "00:00", "23:59", 1),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL CHECK(price >= 0),
                category TEXT NOT NULL,
                icon TEXT DEFAULT '🍽️',
                start_time TEXT NOT NULL DEFAULT '00:00',
                end_time TEXT NOT NULL DEFAULT '23:59',
                stock INTEGER NOT NULL DEFAULT 0,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Upgrade databases created by earlier versions.
        cols = {r["name"] for r in db.execute("PRAGMA table_info(products)").fetchall()}
        if "stock" not in cols:
            db.execute("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0")

        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                contact_number TEXT,
                table_room TEXT,
                note TEXT,
                total REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                confirmed_at TEXT
            )
        """)
        order_cols = {r["name"] for r in db.execute("PRAGMA table_info(orders)").fetchall()}
        if "contact_number" not in order_cols:
            db.execute("ALTER TABLE orders ADD COLUMN contact_number TEXT")

        db.execute("""
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER,
                product_name TEXT NOT NULL,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                amount REAL NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        """)

        count = db.execute("SELECT COUNT(*) AS c FROM products").fetchone()["c"]
        if count == 0:
            upgraded = [(n,p,c,i,s,e,100,a) for n,p,c,i,s,e,a in DEFAULT_PRODUCTS]
            db.executemany("""
                INSERT INTO products
                (name, price, category, icon, start_time, end_time, stock, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, upgraded)
        else:
            # Give legacy/default items a practical starting stock if they have 0.
            db.execute("UPDATE products SET stock=100 WHERE stock IS NULL")



def minutes_from_time(value):
    try:
        h, m = value.split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 0


def item_available(row, now=None):
    if not row["active"]:
        return False
    now = now or datetime.now()
    current = now.hour * 60 + now.minute
    start = minutes_from_time(row["start_time"])
    end = minutes_from_time(row["end_time"])

    if start == end:
        return True
    if start < end:
        return start <= current < end
    return current >= start or current < end


def current_meal():
    mins = datetime.now().hour * 60 + datetime.now().minute
    if 300 <= mins < 660:
        return "Breakfast"
    if 660 <= mins < 900:
        return "Lunch"
    if 900 <= mins < 1320:
        return "Dinner"
    return None


def row_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "category": row["category"],
        "icon": row["icon"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "stock": row["stock"],
        "active": bool(row["active"]),
    }


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/menu")
def api_menu():
    with get_db() as db:
        rows = db.execute("SELECT * FROM products ORDER BY category, name, id").fetchall()

    available = [row_to_dict(r) for r in rows if item_available(r) and r["stock"] > 0]
    return jsonify({
        "items": available,
        "meal": current_meal(),
        "updated": datetime.now().strftime("%I:%M %p"),
    })


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        password_ok = False
        if ADMIN_PASSWORD_HASH:
            password_ok = check_password_hash(ADMIN_PASSWORD_HASH, password)
        else:
            password_ok = password == ADMIN_PASSWORD

        if username == ADMIN_USERNAME and password_ok:
            session["admin_logged_in"] = True
            session["admin_username"] = username
            return redirect(url_for("admin"))

        flash("Invalid username or password.", "danger")

    return render_template("admin_login.html")


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/admin")
@admin_required
def admin():
    with get_db() as db:
        products = db.execute("SELECT * FROM products ORDER BY category, name, id").fetchall()
    return render_template("admin.html", products=products, username=session.get("admin_username"))


@app.post("/admin/products/save")
@admin_required
def save_product():
    product_id = request.form.get("id", "").strip()
    name = request.form.get("name", "").strip()
    category = request.form.get("category", "").strip()
    icon = request.form.get("icon", "").strip() or "🍽️"
    start_time = request.form.get("start_time", "00:00")
    end_time = request.form.get("end_time", "23:59")

    try:
        price = float(request.form.get("price", "0"))
        stock = int(request.form.get("stock", "0"))
    except ValueError:
        flash("Price and stock must be valid numbers.", "danger")
        return redirect(url_for("admin"))

    if not name or price < 0 or stock < 0 or not category:
        flash("Please enter valid food, category, price and stock.", "danger")
        return redirect(url_for("admin"))

    active = 1 if request.form.get("active") == "on" else 0

    with get_db() as db:
        if product_id:
            db.execute("""
                UPDATE products
                SET name=?, price=?, category=?, icon=?, start_time=?, end_time=?,
                    stock=?, active=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
            """, (name, price, category, icon, start_time, end_time, stock, active, product_id))
            flash("Food item updated successfully.", "success")
        else:
            db.execute("""
                INSERT INTO products
                (name, price, category, icon, start_time, end_time, stock, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (name, price, category, icon, start_time, end_time, stock, active))
            flash("Food item added successfully.", "success")

    return redirect(url_for("admin"))


@app.post("/admin/products/delete/<int:product_id>")
@admin_required
def delete_product(product_id):
    with get_db() as db:
        db.execute("DELETE FROM products WHERE id=?", (product_id,))
    flash("Food item deleted.", "success")
    return redirect(url_for("admin"))


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    contact_number = str(data.get("contact_number", "")).strip()
    table_room = str(data.get("table_room", "")).strip()
    note = str(data.get("note", "")).strip()

    if not name:
        return jsonify({"error": "Please enter customer name."}), 400
    if not contact_number:
        return jsonify({"error": "Please enter contact number."}), 400
    digits = "".join(ch for ch in contact_number if ch.isdigit())
    if len(digits) < 10 or len(digits) > 15:
        return jsonify({"error": "Please enter a valid contact number (10-15 digits)."}), 400
    if not table_room:
        return jsonify({"error": "Please enter table or room number."}), 400
    items = data.get("items", [])

    if not isinstance(items, list) or not items:
        return jsonify({"error": "Order is empty."}), 400

    try:
        with get_db() as db:
            product_ids = []
            requested = {}
            for item in items:
                pid = int(item["product_id"])
                qty = int(item["quantity"])
                if qty <= 0:
                    raise ValueError
                requested[pid] = requested.get(pid, 0) + qty
                product_ids.append(pid)

            rows = {}
            for pid in requested:
                row = db.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
                if not row:
                    return jsonify({"error": f"Item {pid} is not available."}), 400
                if not item_available(row):
                    return jsonify({"error": f"{row['name']} is outside its serving time."}), 400
                if row["stock"] < requested[pid]:
                    return jsonify({"error": f"Only {row['stock']} of {row['name']} available."}), 400
                rows[pid] = row

            total = 0
            order_lines = []
            for pid, qty in requested.items():
                p = rows[pid]
                amount = p["price"] * qty
                total += amount
                order_lines.append((pid, p["name"], p["price"], qty, amount))

            cur = db.execute("""
                INSERT INTO orders (customer_name, contact_number, table_room, note, total, status)
                VALUES (?, ?, ?, ?, ?, 'Pending')
            """, (name, contact_number, table_room, note, total))
            order_id = cur.lastrowid

            db.executemany("""
                INSERT INTO order_items
                (order_id, product_id, product_name, price, quantity, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [(order_id, *line) for line in order_lines])

        return jsonify({"ok": True, "order_id": order_id, "total": total})
    except (ValueError, KeyError, TypeError):
        return jsonify({"error": "Invalid order data."}), 400


@app.get("/admin/orders")
@admin_required
def admin_orders():
    status = request.args.get("status", "All")
    with get_db() as db:
        if status == "All":
            orders = db.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
        else:
            orders = db.execute(
                "SELECT * FROM orders WHERE status=? ORDER BY id DESC", (status,)
            ).fetchall()

        details = {}
        for o in orders:
            details[o["id"]] = db.execute(
                "SELECT * FROM order_items WHERE order_id=? ORDER BY id", (o["id"],)
            ).fetchall()

    return render_template("admin_orders.html", orders=orders, details=details, status=status)


@app.post("/admin/orders/<int:order_id>/confirm")
@admin_required
def confirm_order(order_id):
    with get_db() as db:
        order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            flash("Order not found.", "danger")
            return redirect(url_for("admin_orders"))

        if order["status"] != "Pending":
            flash("This order has already been processed.", "warning")
            return redirect(url_for("admin_orders"))

        items = db.execute("SELECT * FROM order_items WHERE order_id=?", (order_id,)).fetchall()

        # Re-check stock and deduct atomically inside this transaction.
        for item in items:
            p = db.execute("SELECT * FROM products WHERE id=?", (item["product_id"],)).fetchone()
            if not p or p["stock"] < item["quantity"]:
                flash(f"Insufficient stock for {item['product_name']}. Order not confirmed.", "danger")
                return redirect(url_for("admin_orders"))

        for item in items:
            cur = db.execute(
                """UPDATE products SET stock=stock-?, updated_at=CURRENT_TIMESTAMP
                   WHERE id=? AND stock>=?""",
                (item["quantity"], item["product_id"], item["quantity"])
            )
            if cur.rowcount != 1:
                flash(f"Stock changed while accepting {item['product_name']}. Order not confirmed.", "danger")
                return redirect(url_for("admin_orders"))

        db.execute(
            "UPDATE orders SET status='Confirmed', confirmed_at=CURRENT_TIMESTAMP WHERE id=?",
            (order_id,)
        )

    flash(f"Order #{order_id} confirmed and stock deducted.", "success")
    return redirect(url_for("admin_orders"))


@app.post("/admin/orders/<int:order_id>/cancel")
@admin_required
def cancel_order(order_id):
    with get_db() as db:
        order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            flash("Order not found.", "danger")
        elif order["status"] != "Pending":
            flash("Only pending orders can be cancelled.", "warning")
        else:
            db.execute("UPDATE orders SET status='Cancelled' WHERE id=?", (order_id,))
            flash(f"Order #{order_id} cancelled.", "success")
    return redirect(url_for("admin_orders"))


@app.get("/admin/reports")
@admin_required
def admin_reports():
    start = request.args.get("start", datetime.now().strftime("%Y-%m-%d"))
    end = request.args.get("end", datetime.now().strftime("%Y-%m-%d"))

    with get_db() as db:
        summary = db.execute("""
            SELECT
                COUNT(*) AS order_count,
                COALESCE(SUM(total),0) AS sales,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(oi.quantity),0)
                     FROM order_items oi WHERE oi.order_id=o.id)
                ),0) AS item_qty
            FROM orders o
            WHERE status='Confirmed'
              AND date(confirmed_at) BETWEEN date(?) AND date(?)
        """, (start, end)).fetchone()

        item_summary = db.execute("""
            SELECT product_name,
                   SUM(quantity) AS quantity,
                   SUM(amount) AS sales
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.status='Confirmed'
              AND date(o.confirmed_at) BETWEEN date(?) AND date(?)
            GROUP BY product_name
            ORDER BY sales DESC
        """, (start, end)).fetchall()

        daily = db.execute("""
            SELECT date(confirmed_at) AS sale_date,
                   COUNT(*) AS orders,
                   SUM(total) AS sales
            FROM orders
            WHERE status='Confirmed'
              AND date(confirmed_at) BETWEEN date(?) AND date(?)
            GROUP BY date(confirmed_at)
            ORDER BY sale_date DESC
        """, (start, end)).fetchall()

    return render_template(
        "admin_reports.html",
        start=start, end=end, summary=summary,
        item_summary=item_summary, daily=daily
    )


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(debug=True)
