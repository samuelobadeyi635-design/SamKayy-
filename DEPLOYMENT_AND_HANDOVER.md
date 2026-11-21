# Sam Kay Animal Feeds — Deployment & Handover Guide

## 1. Overview
This application provides the complete public storefront, Quantity basket and WhatsApp order-enquiry system, and protected Admin Dashboard for **Sam Kay Animal Feeds** (Tanke, Kwara State, Nigeria).

Key business safeguards enforced in code:
- **Private pricing**: Individual product/package prices are never returned on public catalogue or product detail endpoints (`/api/products`, `/api/products/:slug`).
- **Server-side basket totals**: All line totals, wholesale discounts, and estimated totals on `/quantity` are calculated on the server (`POST /api/basket/estimate`).
- **Quotation fallback**: Any product/package without a configured price displays `"Request a quotation on WhatsApp"` instead of a fabricated total.
- **No fabricated claims**: Product ingredients, feeding guidance, and nutritional tables remain empty until verified and entered by the owner in the Admin Dashboard.
- **WhatsApp handoff**: Opening WhatsApp pre-fills the readable order enquiry message to the business WhatsApp number; orders are confirmed only after the customer sends the message and Sam Kay Animal Feeds replies.

---

## 2. Environment Variables
Configure the variables listed in `.env.example`:
- `ADMIN_EMAIL` — Initial administrator email (default: `admin@samkayanimalfeeds.com`)
- `ADMIN_PASSWORD` — Initial administrator password (change immediately before launch)
- `SESSION_SECRET` — Random 32+ character string for signing HTTP-only admin cookies
- `SITE_URL` — Canonical domain once purchased (used in `/sitemap.xml` and `/robots.txt`)
- `PORT` — Server port (`3000`)

---

## 3. Running Locally / Production Build
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build frontend assets: `npm run build`
4. Start production server: `npm start`

The SQLite database (`data/samkay.db`) initializes automatically on first start with:
- 3 categories (`Rabbit Feeds`, `Dog Feeds`, `Cat Feeds`)
- 9 products and photos from the supplied product PDF
- Default Tanke business settings and editable FAQs

---

## 4. Supabase / Netlify Reference Migration
If migrating the database to managed Supabase PostgreSQL, apply `supabase/schema.sql`. It creates all tables (`profiles`, `categories`, `products`, `product_images`, `package_sizes`, `product_prices`, `discount_rules`, `inventory`, `nutritional_info`, `faqs`, `business_settings`, `order_enquiries`) with Row Level Security (RLS) policies keeping `product_prices` and `discount_rules` inaccessible to public clients.

---

## 5. Pre-Launch Owner Checklist
1. Sign in at `/admin/login` and change the default administrator password under **Settings**.
2. Confirm the active WhatsApp number (`+234 09042450053` -> `2349042450053`), Tanke pickup landmark/hours, and delivery areas under **Settings**.
3. Verify each product's enabled package sizes (`1kg`, `2kg`, `5kg`, `10kg`, `20kg`, `25kg`) under **Products**.
4. Enter verified prices in Nigerian Naira (`₦`) under **Pricing**, and configure bulk rules under **Discounts**.
5. Add verified ingredients, feeding guidance, and nutritional specifications where confirmed.
6. Set `SITE_URL` and submit `/sitemap.xml` to Google Search Console once your domain is connected.
