# Canteen Flask + SQLite — Direct Order, Inventory & Reports

Customer orders are now submitted directly to the Flask/SQLite system. **WhatsApp is removed from the ordering workflow.**

## Workflow
1. Customer selects food and quantity.
2. Customer adds food to the cart and reviews selected items.
3. Customer enters name, contact number, table/room and optional note.
4. Customer clicks **Place Order**.
5. Flask saves the order as **Pending**.
6. Admin opens **Orders** and sees the customer contact number and full food order details.
7. Admin clicks **Accept Order & Deduct Stock**.
8. The system checks stock again, deducts each ordered quantity, and changes the order to **Confirmed**.
9. Confirmed orders are included in Sales Reports.

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

## Responsive customer cart
The customer ordering page is designed for phones, tablets, laptops and desktop screens. On phones/tablets the cart opens as a bottom sheet; on larger screens it opens as a side drawer. The fixed cart bar remains accessible while browsing the menu. Food cards, category buttons, quantity controls and customer fields use touch-friendly sizing.

The cart keeps selected items visible during automatic menu refreshes. If stock changes after an item was selected, the cart highlights the problem and the server performs the final stock check when the order is submitted.
