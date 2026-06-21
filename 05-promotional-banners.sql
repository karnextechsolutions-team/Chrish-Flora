CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  description TEXT,
  button_text TEXT DEFAULT 'Shop Now',
  button_link TEXT DEFAULT '/storefront/products',
  image_url   TEXT,
  bg_color    TEXT DEFAULT '#C8CC7A',
  text_color  TEXT DEFAULT '#3D2E00',
  badge_text  TEXT DEFAULT 'New Arrival',
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners"
  ON public.promotional_banners FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage banners"
  ON public.promotional_banners FOR ALL
  USING (public.is_admin());

-- Real-time
ALTER PUBLICATION supabase_realtime 
  ADD TABLE public.promotional_banners;

-- Seed sample banners
INSERT INTO public.promotional_banners 
  (title, subtitle, description, button_text, button_link, 
   bg_color, text_color, badge_text, sort_order)
VALUES
  (
    'Fresh Roses Daily',
    'Premium Red Rose Bouquets',
    'Handpicked fresh roses delivered to your door. Perfect for any occasion.',
    'Order Now',
    '/storefront/products',
    'linear-gradient(135deg, #2D5A3D 0%, #1C3829 100%)',
    '#FEFCF5',
    '🌹 Just Arrived',
    1
  ),
  (
    'Valentine''s Special',
    'Up to 20% OFF on all bouquets',
    'Celebrate love with our handcrafted premium arrangements.',
    'Shop Offers',
    '/storefront/products',
    'linear-gradient(135deg, #C8CC7A 0%, #A8AE4A 100%)',
    '#3D2E00',
    '❤️ Limited Time',
    2
  ),
  (
    'Wedding Collections',
    'Exquisite Floral Arrangements',
    'Make your special day unforgettable with Chrish Flora wedding specialists.',
    'View Collection',
    '/storefront/products',
    'linear-gradient(135deg, #C9962A 0%, #8B6914 100%)',
    '#FEFCF5',
    '💒 Weddings',
    3
  );

-- Storage bucket for banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotional-banners', 'promotional-banners', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public can view banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promotional-banners');

CREATE POLICY "Admins can upload banner images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'promotional-banners');

CREATE POLICY "Admins can delete banner images"  
  ON storage.objects FOR DELETE
  USING (bucket_id = 'promotional-banners');

NOTIFY pgrst, 'reload schema';
