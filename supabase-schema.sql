-- ============================================================
--  CHRISH FLORA — Supabase Database Schema
--  Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
--  Version: 1.0.0
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  sku         TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  category    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. STORE SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name            TEXT NOT NULL DEFAULT 'Chrish Flora',
  store_phone           TEXT,
  store_email           TEXT,
  hq_lat                DOUBLE PRECISION NOT NULL DEFAULT 6.9271,
  hq_lng                DOUBLE PRECISION NOT NULL DEFAULT 79.8612,
  hq_address            TEXT,
  base_delivery_rate    NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
  base_distance_km      NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  rate_per_additional_km NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  branches              JSONB NOT NULL DEFAULT '[]'::JSONB,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name         TEXT NOT NULL,
  customer_email        TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,
  fulfillment_method    TEXT NOT NULL DEFAULT 'Delivery'
                          CHECK (fulfillment_method IN ('Delivery', 'Store Pickup')),
  delivery_address      TEXT,
  delivery_lat          DOUBLE PRECISION,
  delivery_lng          DOUBLE PRECISION,
  delivery_distance_km  DOUBLE PRECISION,
  delivery_charge       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal              NUMERIC(12, 2) NOT NULL,
  total                 NUMERIC(12, 2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'Pending'
                          CHECK (status IN (
                            'Pending', 'Confirmed', 'Processing',
                            'Out for Delivery', 'Delivered', 'Cancelled'
                          )),
  order_note            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- ============================================================
-- 6. INVENTORY FUNCTIONS
-- ============================================================

-- Safely decrement product stock
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id UUID,
  p_quantity    INTEGER
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET quantity = GREATEST(0, quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: is current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- -------- PROFILES --------
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- -------- PRODUCTS --------
-- Anyone can read active products
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

-- Only admins can manage products
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- -------- ORDERS --------
-- Customers can see own orders; admins see all
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Anyone (incl. guests) can insert orders
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (TRUE);

-- Only admins can update orders (status changes)
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

-- Admins can delete orders
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- -------- ORDER ITEMS --------
CREATE POLICY "Customers can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
        AND (user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (TRUE);

-- -------- STORE SETTINGS --------
-- Public can read settings (needed for delivery calc)
CREATE POLICY "Public can read store settings"
  ON public.store_settings FOR SELECT
  USING (TRUE);

-- Only admins can manage settings
CREATE POLICY "Admins can manage store settings"
  ON public.store_settings FOR ALL
  USING (public.is_admin());

-- ============================================================
-- 8. REAL-TIME SUBSCRIPTIONS
-- ============================================================
-- Enable real-time for orders table (admin dashboard live feed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ============================================================
-- 9. SEED DATA — Default Store Settings
-- ============================================================
INSERT INTO public.store_settings (
  store_name, store_phone, store_email,
  hq_lat, hq_lng, hq_address,
  base_delivery_rate, base_distance_km, rate_per_additional_km,
  branches
) VALUES (
  'Chrish Flora',
  '+94 11 234 5678',
  'hello@chrishflora.lk',
  6.9271,
  79.8612,
  '42 Floral Avenue, Colombo 3, Sri Lanka',
  300.00,
  5.00,
  50.00,
  '[
    {
      "id": "branch-001",
      "name": "Colombo Boutique",
      "address": "42 Floral Avenue, Colombo 3",
      "lat": 6.9271,
      "lng": 79.8612,
      "phone": "+94 11 234 5678"
    },
    {
      "id": "branch-002",
      "name": "Negombo Branch",
      "address": "15 Beach Road, Negombo",
      "lat": 7.2083,
      "lng": 79.8358,
      "phone": "+94 31 222 3344"
    }
  ]'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. SEED DATA — Sample Products
-- ============================================================
INSERT INTO public.products (name, slug, description, price, quantity, sku, category, is_active) VALUES
  (
    'Crimson Elegance Bouquet',
    'crimson-elegance-bouquet',
    'A stunning arrangement of deep red roses and velvet blooms, perfect for romantic occasions.',
    4500.00, 15, 'CF-BOQ-001', 'Bouquets', TRUE
  ),
  (
    'Ivory Grace Arrangement',
    'ivory-grace-arrangement',
    'Delicate white lilies and cream orchids artfully composed in a tall crystal vase.',
    6800.00, 8, 'CF-ARR-002', 'Arrangements', TRUE
  ),
  (
    'Sunrise Meadow Basket',
    'sunrise-meadow-basket',
    'A cheerful mix of sunflowers, orange gerbera, and golden chrysanthemums in a woven basket.',
    3200.00, 22, 'CF-BSK-003', 'Baskets', TRUE
  ),
  (
    'Lavender Dreams Wreath',
    'lavender-dreams-wreath',
    'Soothing lavender sprigs and purple statice woven into an aromatic door or wall wreath.',
    2800.00, 10, 'CF-WRE-004', 'Wreaths', TRUE
  ),
  (
    'Tropical Paradise Collection',
    'tropical-paradise-collection',
    'Bold birds of paradise, anthuriums, and exotic foliage celebrating Sri Lanka''s rich flora.',
    7500.00, 5, 'CF-COL-005', 'Collections', TRUE
  ),
  (
    'Blush Peony Centrepiece',
    'blush-peony-centrepiece',
    'Lush blush peonies and garden roses create a romantic centrepiece for weddings and events.',
    9200.00, 3, 'CF-CEN-006', 'Centrepieces', TRUE
  ),
  (
    'Garden Fresh Mixed Bunch',
    'garden-fresh-mixed-bunch',
    'A handpicked daily selection of the freshest seasonal blooms from our partner gardens.',
    1800.00, 30, 'CF-MIX-007', 'Bouquets', TRUE
  ),
  (
    'Orchid Luxury Box',
    'orchid-luxury-box',
    'Premium Dendrobium orchids arranged in a signature Chrish Flora keepsake gift box.',
    12000.00, 4, 'CF-BOX-008', 'Gift Boxes', TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 11. HOW TO CREATE YOUR FIRST ADMIN USER
-- ============================================================
-- Step 1: Sign up via Supabase Auth (Authentication → Users → Invite User)
--         OR run the Next.js app and register at /auth/login
--
-- Step 2: Once the user exists, run this to make them admin:
--
--   UPDATE public.profiles
--   SET role = 'admin'
--   WHERE id = 'PASTE-YOUR-USER-UUID-HERE';
--
-- ============================================================
-- DONE! Your Chrish Flora database is ready.
-- ============================================================
