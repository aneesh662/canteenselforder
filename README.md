# Canteen Ordering System — Flask + SQLite

A complete direct-order canteen system with a mobile-first customer cart, contact number capture, SQLite orders, inventory control, admin order acceptance, and sales reports.

## Customer ordering workflow

1. Customer opens the food menu on a phone, tablet, laptop, or desktop.
2. Customer taps **Add to Cart** on a food item.
3. The item immediately appears in the **Selected Items** cart.
4. A fixed **🛒 Selected Items** slider remains visible at the bottom while the customer browses.
5. The top **🛒 Cart** button also shows the selected-item count and opens the same cart.
6. Customer taps the slider or top Cart button to open the full cart.
7. In the cart the customer can increase/decrease quantity or remove food.
8. Customer enters:
   - **Customer Name** — required
   - **Contact Number** — required
   - **Table / Room** — required
   - **Note** — optional
9. Customer taps **Place Order**.
10. Browser sends the order to `POST /api/orders`.
11. Flask validates the customer details, contact number, food items, serving time, and available stock.
12. The order and all order items are saved directly into SQLite with status **Pending**. Stock is NOT deducted at this stage.
13. Customer receives an Order # confirmation.

## Admin workflow

1. Admin opens **Customer Orders**.
2. Each order shows:
   - Order number/date
   - Customer name
   - Contact number (clickable `tel:` link)
   - Table / Room
   - Note
   - Full food ordered list
   - Unit price
   - Quantity
   - Amount
   - Order total
3. Admin clicks **Accept Order & Deduct Stock**.
4. Flask rechecks stock and deducts the ordered quantity atomically.
5. Order changes from **Pending** to **Confirmed**.
6. Only Confirmed orders are included in Sales Reports.

## Mobile responsive behavior

- Responsive Bootstrap layout for phone, tablet, laptop, and desktop.
- Large touch-friendly Add to Cart and quantity controls.
- Top Cart button is always accessible.
- Bottom Selected Items slider is always accessible while browsing.
- On phones/tablets the cart uses a full-width offcanvas/bottom-friendly layout.
- On larger screens the cart uses a right-side drawer.
- Customer fields are inside the cart so the complete order can be reviewed before submission.

## Local run

```text
py -3.13 -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Customer: `http://127.0.0.1:5000`

Admin: `http://127.0.0.1:5000/admin/login`

Default local admin: `admin` / `admin123`

For production, set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SECRET_KEY` as environment variables.

## Render deployment

Build command:

```text
pip install -r requirements.txt
```

Start command:

```text
gunicorn app:app
```

Recommended environment variables:

```text
PYTHON_VERSION=3.13
ADMIN_USERNAME=<your-admin>
ADMIN_PASSWORD=<strong-password>
SECRET_KEY=<strong-random-secret>
DB_PATH=/var/data/canteen.db
```

Mount a persistent Render disk at `/var/data` so SQLite data survives redeploys.
