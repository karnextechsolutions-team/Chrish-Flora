-- Daily revenue aggregation
CREATE OR REPLACE FUNCTION get_daily_revenue(
  start_date DATE, 
  end_date DATE
)
RETURNS TABLE(
  sale_date DATE, 
  delivery_revenue NUMERIC, 
  pickup_revenue NUMERIC,
  total_revenue NUMERIC,
  order_count INTEGER
) LANGUAGE sql STABLE AS $$
  SELECT 
    DATE(created_at) as sale_date,
    SUM(CASE WHEN fulfillment_method = 'Delivery' 
        THEN total ELSE 0 END) as delivery_revenue,
    SUM(CASE WHEN fulfillment_method = 'Store Pickup' 
        THEN total ELSE 0 END) as pickup_revenue,
    SUM(total) as total_revenue,
    COUNT(*)::INTEGER as order_count
  FROM public.orders
  WHERE DATE(created_at) BETWEEN start_date AND end_date
    AND status != 'Cancelled'
  GROUP BY DATE(created_at)
  ORDER BY sale_date;
$$;

-- Top products report
CREATE OR REPLACE FUNCTION get_top_products(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  image_url TEXT,
  units_sold BIGINT,
  revenue NUMERIC,
  current_stock INTEGER
) LANGUAGE sql STABLE AS $$
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.image_url,
    SUM(oi.quantity) as units_sold,
    SUM(oi.quantity * oi.unit_price) as revenue,
    p.quantity as current_stock
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.orders o ON o.id = oi.order_id
  WHERE DATE(o.created_at) BETWEEN start_date AND end_date
    AND o.status != 'Cancelled'
  GROUP BY p.id, p.name, p.sku, p.image_url, p.quantity
  ORDER BY revenue DESC
  LIMIT 10;
$$;

NOTIFY pgrst, 'reload schema';
