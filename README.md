# Canteen Flask + SQLite — Direct Order, Inventory & Reports

Customer orders are now submitted directly to the Flask/SQLite system. **WhatsApp is removed from the ordering workflow.**

## Workflow
1. Customer selects food and quantity.
2. Customer enters name and table/room.
3. Customer clicks **Place Order**.
4. Flask saves the order as **Pending**.
5. Admin opens **Orders** and sees the full food order details.
6. Admin clicks **Accept Order & Deduct Stock**.
7. The system checks stock again, deducts each ordered quantity, and changes the order to **Confirmed**.
8. Confirmed orders are included in Sales Reports.

Stock is not deducted merely when a customer places an order.

## Local run
`py -3.13 -m venv venv`
`venv\\Scripts\\activate`
`pip install -r requirements.txt`
`python app.py`

Customer: `http://127.0.0.1:5000`
Admin: `http://127.0.0.1:5000/admin/login`
Default local login: `admin` / `admin123`

## Render
Build: `pip install -r requirements.txt`
Start: `gunicorn app:app`
Environment variables: `PYTHON_VERSION=3.13`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY`, `DB_PATH=/var/data/canteen.db`.
Add a persistent disk mounted at `/var/data` for SQLite persistence.


## Latest customer ordering UI
- Customer enters Name, Contact Number, Table/Room and optional Note.
- Food is selected with Add to Cart.
- A compact fixed cart slider stays at the bottom of the screen. Tap it to open the full Selected Items cart.
- Place Order saves directly to SQLite as Pending.
- Contact number is saved with the order and shown to Admin.
