# Khan Chaye POS

Internal point-of-sale for Khan Chaye — daily order taking, expense logging, and
item management. Not public-facing; built for staff and admin use only.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres) for storage, accessed only from the server via the
  service-role key — the database is never exposed to the browser
- Cookie-based sessions (no third-party auth): a shared **staff PIN** unlocks
  the order screen, a separate **admin password** unlocks item/expense
  management and reports

## One-time setup

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's up, open **SQL Editor** → New query, and run the files in
   `sql/` **in order** — each is a one-time migration, run once each:
   - [`sql/schema.sql`](sql/schema.sql) — creates `items`, `orders`,
     `order_items`, `expenses`, with a few starter menu items
   - [`sql/002_wastage_and_returns.sql`](sql/002_wastage_and_returns.sql) —
     adds the `returned` order status and a `wastage` table
   - [`sql/003_real_menu.sql`](sql/003_real_menu.sql) — swaps the starter
     items for the real printed Khan Chaye menu
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this
     secret — it bypasses all database restrictions)

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STAFF_PIN=...          # shared PIN staff use to open the POS
ADMIN_PASSWORD=...     # stronger password for Admin
SESSION_SECRET=...     # long random string, e.g. `openssl rand -hex 32`
```

### 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/login` (staff PIN) or you
can go straight to `/admin/login`.

## Deploying

Deploy this folder as its own Vercel project (separate from the marketing
site in `../website`), then add the same environment variables in
**Vercel → Project Settings → Environment Variables**. Point the subdomain
`pos.khanchaye.com` at this project under **Settings → Domains**.

## How it's organized

- `/login`, `/admin/login` — PIN / password entry, sets a signed session cookie
- `/pos` — order-taking screen (staff + admin)
- `/pos/orders` — today's orders, read-only (staff + admin)
- `/admin` — sales / expenses / wastage / net dashboard (admin only)
- `/admin/items` — add/edit/delete menu items (admin only)
- `/admin/expenses` — log and manage cash expenses, e.g. milk, tea leaves,
  flour, gas, rent (admin only)
- `/admin/wastage` — log spoiled/burnt/dropped stock, optionally linked to a
  menu item, separate from cash expenses (admin only)
- `/admin/orders` — full order history with date filtering, **void** (order
  that should never have counted) and **mark returned** (order that was
  served, then refunded/returned) (admin only)

An order's status is one of `completed`, `voided`, or `returned`. Only
`completed` orders count toward sales — voided and returned are both
excluded, but tracked separately so you can tell "we made a mistake" apart
from "the customer wasn't happy."

`src/proxy.ts` (Next's middleware convention, renamed) gates every `/pos/*`
and `/admin/*` route based on the session cookie's role before any page code
runs.
