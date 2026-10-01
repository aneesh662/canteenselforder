# Canteen WhatsApp Ordering App

## Features
- Responsive HTML5 + CSS + JavaScript + Bootstrap
- Breakfast: 5:00 AM–11:00 AM
- Lunch: 11:00 AM–3:00 PM
- Dinner: 3:00 PM–10:00 PM
- Drinks and Snacks available all day
- Search and category filters
- Cart with quantity controls
- WhatsApp ordering to 8589900277
- Exact WhatsApp order format
- Cart and customer fields clear after sending
- Hidden admin panel
- Admin username: `admin`
- Admin password: `admin123`
- Admin can add/edit/delete food, price, category, start/end time, icon and show/hide
- Menu checks the clock every 30 seconds and reloads the latest localStorage data
- Menu refreshes when the browser tab becomes visible again
- Changes from another browser tab are detected

## Admin access
Tap the 🍽️ Canteen logo 5 times quickly.

## Important
This admin login is frontend-only. The username/password are present in JavaScript and should NOT be used as real security for a public production application. For production, use a backend such as Flask + SQLite/MySQL with server-side authentication.

## Run
Open `index.html` in a browser. Internet is required for Bootstrap CDN.

## WhatsApp
The configured number is `918589900277` (India country code + 8589900277).


## Admin Login — Updated
There is now a visible **⚙️ Admin** button at the top of the customer screen and an **Admin Login** link at the bottom.

Login:
- Username: `admin`
- Password: `admin123`

After login, the admin panel provides:
- Add Food
- Edit Food
- Delete Food
- Price
- Category
- Start Time
- End Time
- Show/Hide item

The old hidden 5-tap logo access also remains available.
