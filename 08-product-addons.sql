-- Product Add-ons table (wrapping papers, ribbons, etc.)
CREATE TABLE IF NOT EXISTS public.product_addons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL 
    CHECK (type IN ('wrapping_paper', 'ribbon', 'card', 'vase', 'other')),
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url   TEXT,
  color_hex   TEXT,  -- e.g. "#FF69B4" for color preview dot
  is_active   BOOLEAN DEFAULT true,
  is_in_stock BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add-ons selected per order item
CREATE TABLE IF NOT EXISTS public.order_item_addons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) 
    ON DELETE CASCADE,
  addon_id      UUID NOT NULL REFERENCES public.product_addons(id)
    ON DELETE RESTRICT,
  addon_name    TEXT NOT NULL,
  addon_price   NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active addons"
  ON public.product_addons FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage addons"
  ON public.product_addons FOR ALL
  USING (public.is_admin());

CREATE POLICY "Anyone can insert order item addons"
  ON public.order_item_addons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own order addons"
  ON public.order_item_addons FOR SELECT
  USING (true);

-- Seed sample add-ons
INSERT INTO public.product_addons 
  (name, description, type, price, color_hex, is_active, is_in_stock, sort_order)
VALUES
  ('Kraft Brown Wrap', 'Natural kraft paper wrapping', 'wrapping_paper', 150, '#C4A882', true, true, 1),
  ('Blush Pink Wrap', 'Elegant blush pink paper', 'wrapping_paper', 200, '#FFB6C1', true, true, 2),
  ('Sage Green Wrap', 'Botanical sage green wrapping', 'wrapping_paper', 200, '#8FBC8F', true, true, 3),
  ('Ivory White Wrap', 'Premium ivory wrapping paper', 'wrapping_paper', 250, '#FFFFF0', true, true, 4),
  ('Gold Foil Wrap', 'Luxury gold foil paper', 'wrapping_paper', 350, '#C9962A', true, true, 5),
  ('Classic Red Ribbon', 'Elegant red satin ribbon', 'ribbon', 100, '#DC143C', true, true, 6),
  ('Gold Ribbon', 'Premium gold metallic ribbon', 'ribbon', 150, '#C9962A', true, true, 7),
  ('Blush Ribbon', 'Soft blush pink ribbon', 'ribbon', 100, '#FFB6C1', true, true, 8),
  ('White Ribbon', 'Pure white satin ribbon', 'ribbon', 100, '#FFFFFF', true, true, 9),
  ('Message Card', 'Handwritten greeting card', 'card', 100, null, true, true, 10);

-- Storage for addon images
INSERT INTO storage.buckets (id, name, public)
VALUES ('addon-images', 'addon-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public can view addon images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'addon-images');

CREATE POLICY "Admins can manage addon images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'addon-images');

NOTIFY pgrst, 'reload schema';
