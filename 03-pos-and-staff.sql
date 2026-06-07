-- Add is_active to profiles for account blocking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add cashier_id to orders (who processed POS sale)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cashier_id UUID 
REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add payment_method to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT 
DEFAULT 'Cash' CHECK (
  payment_method IN ('Cash', 'Card', 'QR', 'Online')
);

NOTIFY pgrst, 'reload schema';
