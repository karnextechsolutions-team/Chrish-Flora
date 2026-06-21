-- Fix payment_method constraint to allow PayHere
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('Cash', 'Card', 'QR', 'Online', 'PayHere'));

-- Add payment tracking columns if not exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT 
  DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled'));

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_id TEXT;

NOTIFY pgrst, 'reload schema';
