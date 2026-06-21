-- Add cash_on_delivery_enabled to store_settings
-- store_settings uses JSONB, so update the existing row:
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS cash_on_delivery_enabled 
  BOOLEAN DEFAULT true;

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS online_payment_enabled
  BOOLEAN DEFAULT true;

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS online_payment_note
  TEXT DEFAULT 'Secure payment via PayHere';

NOTIFY pgrst, 'reload schema';

-- Update existing settings row
UPDATE public.store_settings 
SET 
  cash_on_delivery_enabled = true,
  online_payment_enabled = true
WHERE id IS NOT NULL;
