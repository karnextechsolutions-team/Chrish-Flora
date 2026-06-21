-- Add columns to public.store_settings
ALTER TABLE public.store_settings 
  ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT '{"monday": {"open": "08:00", "close": "18:00", "closed": false}, "tuesday": {"open": "08:00", "close": "18:00", "closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "closed": false}, "thursday": {"open": "08:00", "close": "18:00", "closed": false}, "friday": {"open": "08:00", "close": "18:00", "closed": false}, "saturday": {"open": "09:00", "close": "17:00", "closed": false}, "sunday": {"open": "09:00", "close": "14:00", "closed": false}}'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_notify_enabled BOOLEAN DEFAULT false;

-- Add columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS requested_delivery_time TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
