import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, CreditCard, Calendar, ArrowRight, User, Settings } from 'lucide-react';
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

export default async function AccountOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, image_url, sku))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const safeOrders = orders || [];
  
  // Total Spent (only active/completed orders)
  const totalSpent = safeOrders.reduce((sum, order) => {
    if (order.status !== 'Cancelled') {
      return sum + Number(order.total);
    }
    return sum;
  }, 0);

  // Join Date calculations
  const createdAt = profile?.created_at || user.created_at;
  const joinDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const memberSinceMonthYear = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'N/A';

  // Greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';

  const firstName = profile?.full_name?.split(' ')[0] || 'Customer';

  const recentOrders = safeOrders.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div>
        <h1 className="font-serif text-4xl text-[#5C4A00] leading-tight">
          {greeting}, {firstName}! 🌸
        </h1>
        <p className="font-sans text-xs text-[#C9962A] tracking-wider uppercase font-semibold mt-2">
          Member since {joinDate}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Stat 1: Total Orders */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
            <ShoppingBag className="text-[#C9962A]" size={22} />
          </div>
          <div>
            <p className="font-serif text-3xl font-bold text-[#C9962A] tabular-nums">
              {safeOrders.length}
            </p>
            <p className="font-sans text-xs font-semibold text-[#5C4A00]/50 uppercase tracking-wider mt-0.5">
              Orders Placed
            </p>
          </div>
        </div>

        {/* Stat 2: Total Spent */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
            <CreditCard className="text-[#C9962A]" size={22} />
          </div>
          <div>
            <p className="price-display text-2xl font-bold text-[#C9962A] truncate max-w-[150px]">
              LKR {totalSpent.toLocaleString('en-LK')}
            </p>
            <p className="font-sans text-xs font-semibold text-[#5C4A00]/50 uppercase tracking-wider mt-0.5">
              Total Spent
            </p>
          </div>
        </div>

        {/* Stat 3: Member Since */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-100 flex items-center justify-center shrink-0">
            <Calendar className="text-[#C9962A]" size={22} />
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-[#C9962A] truncate max-w-[150px]">
              {memberSinceMonthYear}
            </p>
            <p className="font-sans text-xs font-semibold text-[#5C4A00]/50 uppercase tracking-wider mt-0.5">
              Member Since
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-[#5C4A00] font-bold">
            Recent Orders
          </h2>
          {safeOrders.length > 3 && (
            <Link
              href="/storefront/account/orders"
              className="text-xs font-sans font-bold text-[#C9962A] hover:underline flex items-center gap-1"
            >
              View All Orders <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
            <p className="text-4xl mb-3 select-none">🌸</p>
            <h3 className="font-serif text-lg font-bold text-[#5C4A00]">No orders yet</h3>
            <p className="text-xs text-[#5C4A00]/50 mt-1 max-w-xs mx-auto">
              Ready to color your days? Explore our fresh curated botanical arrangements.
            </p>
            <Link
              href="/storefront/products"
              className="mt-4 inline-block bg-[#C9962A] hover:bg-[#B28221] text-white text-xs font-sans uppercase tracking-widest font-bold py-2.5 px-6 rounded-xl transition-all"
            >
              Shop Collections
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order) => {
              const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              // Gather images
              const items = order.order_items || [];
              const displayItems = items.slice(0, 3);
              const extraCount = items.length - 3;
              const itemNames = items.map((i: any) => i.product?.name || 'Floral Arrangement').join(', ');

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-gray-200"
                >
                  {/* Left: ID & Date */}
                  <div className="space-y-1 shrink-0">
                    <span className="font-mono text-xs font-bold text-[#C9962A]">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <p className="text-xs text-[#5C4A00]/40 font-sans">{orderDate}</p>
                  </div>

                  {/* Center: Images Preview & Names */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex -space-x-3 overflow-hidden shrink-0 select-none">
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
                    <div className="min-w-0">
                      <p className="text-xs text-[#5C4A00]/60 font-sans truncate max-w-full">
                        {itemNames}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status & Total */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-gray-50 pt-3 sm:pt-0 gap-3">
                    <span className={`text-[10px] uppercase font-sans font-bold tracking-widest px-2.5 py-1 rounded-full border ${statusStyles[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {order.status}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-sans text-xs text-gold-600/70">LKR</span>
                      <span className="price-small text-gold-600">
                        {Number(order.total).toLocaleString('en-LK')}
                      </span>
                    </div>
                    <Link
                      href={`/storefront/account/orders/${order.id}`}
                      className="text-[10px] font-sans font-bold text-[#C9962A] hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Profile Info Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-serif text-xl text-[#5C4A00] font-bold mb-4">
          Profile Details
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-olive-50/50 border border-olive-100 flex items-center justify-center shrink-0 text-[#C8CC7A]">
              <User size={24} />
            </div>
            <div className="min-w-0">
              <h4 className="font-sans font-bold text-sm text-[#5C4A00] truncate">
                {profile?.full_name || 'Not configured'}
              </h4>
              <p className="text-xs text-[#5C4A00]/50 truncate mt-0.5">
                {user.email}
              </p>
              {profile?.phone && (
                <p className="text-xs text-[#5C4A00]/50 truncate mt-0.5">
                  {profile.phone}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/storefront/account/settings"
            className="flex items-center justify-center gap-2 border border-[#C9962A] hover:bg-gold-50/20 text-[#C9962A] text-xs font-sans uppercase tracking-widest font-bold py-3 px-6 rounded-xl transition-all w-full sm:w-auto"
          >
            <Settings size={14} />
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
