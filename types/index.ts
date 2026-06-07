// types/index.ts

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type FulfillmentMethod = 'Delivery' | 'Store Pickup';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  quantity: number;
  sku: string;
  image_url: string | null;
  images: string[];
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_method: FulfillmentMethod;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_distance_km: number | null;
  delivery_charge: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  order_note: string | null;
  cashier_id?: string | null;
  payment_method?: 'Cash' | 'Card' | 'QR' | 'Online';
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Profile {
  id: string;
  role: 'customer' | 'admin' | 'staff';
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  hq_lat: number;
  hq_lng: number;
  hq_address: string;
  base_delivery_rate: number;
  base_distance_km: number;
  rate_per_additional_km: number;
  store_name: string;
  store_phone: string;
  store_email: string;
  branches: StoreBranch[];
  updated_at: string;
}

export interface StoreBranch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}
