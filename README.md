# 🌸 Chrish Flora — Luxury Floral E-Commerce

A full-stack luxury floral boutique with real-time admin management console.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, RLS)
- **Mapping**: React-Leaflet + OpenStreetMap (Nominatim)
- **Fonts**: Cormorant Garamond, DM Sans, Playfair Display

## Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Gold | `#C9962A` | Primary actions, accents |
| Olive | `#BEC96A` | Hero backgrounds |
| Brown | `#5C4A00` | Text, admin sidebar |
| Cream | `#FBF7EE` | Page background |

---

## Setup Instructions

### 1. Clone & Install

```bash
cd chrish-flora
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon key** from Settings → API

### 3. Run Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Paste the entire contents of **`supabase-schema.sql`**
3. Click **Run**

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Create Admin User

1. In Supabase → Authentication → Users → **Invite User** (enter your email)
2. Click the magic link from your email to set a password
3. In SQL Editor, run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR-USER-UUID';
```

### 6. Start Development Server

```bash
npm run dev
```

Visit:
- **Storefront**: http://localhost:3000/storefront
- **Admin Panel**: http://localhost:3000/admin/dashboard
- **Login**: http://localhost:3000/auth/login

---

## Project Structure

```
chrish-flora/
├── app/
│   ├── auth/login/          # Staff login page
│   ├── storefront/          # Customer-facing store
│   │   ├── page.tsx         # Homepage with hero + featured products
│   │   ├── products/        # Full product catalogue
│   │   ├── checkout/        # Map-first checkout flow
│   │   └── order-confirmation/
│   └── admin/               # Admin management console
│       ├── dashboard/       # Stats + live order feed
│       ├── orders/          # Order pipeline with detail modal
│       ├── products/        # Product CRUD
│       └── settings/        # Store config + HQ map
├── components/
│   ├── storefront/          # Nav, ProductCard, CartDrawer, CheckoutClient
│   ├── admin/               # Sidebar, Header, all admin UIs
│   ├── map/                 # DeliveryMap, AdminHQMap (Leaflet)
│   └── ui/                  # LoginForm
├── lib/
│   ├── supabase/            # Client, server, middleware helpers
│   ├── cart-context.tsx     # React context for cart state
│   └── delivery.ts          # Haversine distance + pricing calculator
├── types/
│   └── index.ts             # All TypeScript interfaces
└── supabase-schema.sql      # Complete DB schema + RLS + seed data
```

---

## Key Features

### Customer Storefront
- ✅ Real-time inventory: `IN STOCK (X UNITS)` / `OUT OF STOCK`
- ✅ Map-first checkout with pin-drop on Leaflet map
- ✅ "Use My Location" GPS button
- ✅ OpenStreetMap reverse geocoding → auto-fills address fields
- ✅ Live delivery charge calculation (Haversine formula)
- ✅ Delivery vs Store Pickup toggle
- ✅ Persistent cart via localStorage

### Admin Console
- ✅ Real-time order pipeline (Supabase Realtime)
- ✅ One-click status lifecycle management
- ✅ Granular order detail modal with visual fulfillment checklist
- ✅ Financial summary with `tabular-nums` alignment
- ✅ Product CRUD with stock management
- ✅ Dynamic store settings with HQ map picker
- ✅ Role-based access (admin/staff only)

### Database
- ✅ Full RLS policies — customers see only own data
- ✅ Auto-profile creation on signup trigger
- ✅ `decrement_stock()` RPC function prevents race conditions
- ✅ Real-time publication for orders and products tables

---

## Delivery Pricing Formula

```
charge = base_rate                          (if distance ≤ base_km)
charge = base_rate + (distance - base_km) × rate_per_km   (if distance > base_km)
```

Default values (configurable in Admin → Settings):
- Base Rate: LKR 300
- Base Distance: 5 km
- Rate per Additional KM: LKR 50

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add your environment variables in the Vercel project dashboard.

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
