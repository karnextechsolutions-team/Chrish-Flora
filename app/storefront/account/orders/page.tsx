import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Package, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const statusStyles: Record<string, string> = {
  Pending:          'bg-yellow-50 text-yellow-800 border-yellow-100',
  Confirmed:        'bg-blue-50 text-blue-800 border-blue-100',
  Processing:       'bg-purple-50 text-purple-800 border-purple-100',
  'Out for Delivery':'bg-orange-50 text-orange-800 border-orange-100',
  Delivered:        'bg-green-50 text-green-800 border-green-100',
  Cancelled:        'bg-red-50 text-red-800 border-red-100',
};

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Out for Delivery', value: 'Out for Delivery' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function OrderHistoryPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let query = supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, image_url, sku))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: orders } = await query;
  const safeOrders = orders || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-baseline gap-3 border-b border-gray-50 pb-5">
        <h1 className="font-serif text-3xl text-[#5C4A00]">
          My Orders
        </h1>
        <span className="text-xs font-sans font-bold text-[#C9962A] bg-gold-50 border border-gold-100 px-2.5 py-0.5 rounded-full">
          {safeOrders.length} {safeOrders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-6 px-6 scrollbar-none select-none">
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          const href = tab.value === 'all' 
            ? '/storefront/account/orders' 
            : `/storefront/account/orders?status=${tab.value}`;

          return (
            <Link
              key={tab.value}
              href={href}
              className={`text-xs font-sans font-semibold px-4 py-2 rounded-full border transition-all shrink-0 ${
                isActive
                  ? 'bg-[#C9962A] border-[#C9962A] text-white shadow-sm'
                  : 'bg-gray-50 border-gray-100 text-[#5C4A00]/60 hover:bg-gray-100 hover:text-[#5C4A00]'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Orders List */}
      {safeOrders.length === 0 ? (
        <div className="bg-white rounded-2xl py-16 px-6 border border-gray-100 shadow-sm text-center">
          <p className="text-5xl mb-4 select-none">🌸</p>
          <h3 className="font-serif text-xl font-bold text-[#5C4A00]">
            {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter.toLowerCase()} orders`}
          </h3>
          <p className="text-xs text-[#5C4A00]/40 mt-2 max-w-sm mx-auto leading-relaxed">
            {statusFilter === 'all'
              ? 'Start shopping and your orders will appear here. Find flowers for any occasion.'
              : `There are currently no orders in the ${statusFilter.toLowerCase()} status.`}
          </p>
          <Link
            href="/storefront/products"
            className="mt-6 inline-block bg-[#C9962A] hover:bg-[#B28221] text-white text-xs font-sans uppercase tracking-widest font-bold py-3.5 px-8 rounded-xl transition-all shadow-sm"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {safeOrders.map((order) => {
            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const items = order.order_items || [];
            const displayItems = items.slice(0, 3);
            const extraCount = items.length - 3;
            const mainItemName = items[0]?.product?.name || 'Floral Arrangement';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-4 transition-all hover:border-gray-200"
              >
                {/* Top Row: ID & Status */}
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <span className="font-mono text-xs font-bold text-[#C9962A]">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-[9px] uppercase font-sans font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${statusStyles[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {order.status}
                  </span>
                </div>

                {/* Middle Row: Overlapping Thumbnails & Names */}
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2 shrink-0 select-none">
                    {displayItems.map((item: any, idx: number) => (
                      <div
                        key={item.id}
                        className="w-10 h-10 rounded-full border-2 border-white bg-olive-50 overflow-hidden flex items-center justify-center shadow-sm"
                        style={{ zIndex: 30 - idx }}
                      >
                        {item.product?.image_url ? (
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name || 'Product'}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">🌸</span>
                        )}
                      </div>
                    ))}
                    {extraCount > 0 && (
                      <div className="w-10 h-10 rounded-full border-2 border-white bg-gold-50 text-[#C9962A] flex items-center justify-center font-sans text-[10px] font-bold shadow-sm z-0">
                        +{extraCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-semibold text-[#5C4A00] truncate">
                      {mainItemName}
                    </p>
                    {items.length > 1 && (
                      <p className="text-xs text-[#5C4A00]/40 font-sans mt-0.5">
                        +{items.length - 1} more item{items.length - 1 === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Date & Fulfillment + Total & View link */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-[#5C4A00]/50 font-sans">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-[#C9962A]/60" />
                      {orderDate}
                    </span>
                    <span className="hidden sm:inline text-gray-200">•</span>
                    <span>
                      {order.fulfillment_method === 'Delivery' ? '🚚 Delivery' : '🏪 Store Pickup'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-sans text-xs text-gold-600/70">LKR</span>
                      <span className="price-small text-gold-600">
                        {Number(order.total).toLocaleString('en-LK')}
                      </span>
                    </div>
                    <Link
                      href={`/storefront/account/orders/${order.id}`}
                      className="text-xs font-sans font-bold text-[#C9962A] hover:underline flex items-center gap-0.5"
                    >
                      Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
