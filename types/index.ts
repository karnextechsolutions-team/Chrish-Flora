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
  requested_delivery_date?: string | null;
  requested_delivery_time?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Product;
  order_item_addons?: OrderItemAddon[];
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
  cash_on_delivery_enabled?: boolean;
  online_payment_enabled?: boolean;
  online_payment_note?: string | null;
  business_hours?: any;
  whatsapp_notify_number?: string;
  whatsapp_notify_enabled?: boolean;
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

export interface CartItemAddon {
  id: string;
  name: string;
  type: string;
  price: number;
  color_hex?: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  addons?: CartItemAddon[];      // Selected add-ons
  addonTotal?: number;           // Total addon price
  itemTotal?: number;            // product.price + addonTotal
  cartItemId: string;            // Unique cart item identifier
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

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  button_text: string;
  button_link: string;
  image_url: string | null;
  bg_color: string;
  text_color: string;
  badge_text: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  description: string | null;
  type: 'wrapping_paper' | 'ribbon' | 'card' | 'vase' | 'other';
  price: number;
  image_url: string | null;
  color_hex: string | null;
  is_active: boolean;
  is_in_stock: boolean;
  sort_order: number;
  created_at: string;
}

export interface OrderItemAddon {
  id: string;
  order_item_id: string;
  addon_id: string;
  addon_name: string;
  addon_price: number;
}

