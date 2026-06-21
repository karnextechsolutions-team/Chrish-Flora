'use client';
// components/admin/ReportsClient.tsx
import { useState, useEffect, Fragment } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Calendar, FileDown, TrendingUp, ShoppingBag, CreditCard, DollarSign, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product_id: string;
  product?: {
    name: string;
    sku: string;
    image_url: string | null;
    quantity: number;
  };
}

interface Order {
  id: string;
  created_at: string;
  fulfillment_method: string;
  total: number;
  subtotal: number;
  delivery_charge: number;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  payment_method: string;
  cashier_id: string | null;
  order_items?: OrderItem[];
}

interface StaffProfile {
  id: string;
  full_name: string | null;
}

export default function ReportsClient() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Loaded Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    // Set initial date range to "This Month"
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Fetch reporting data whenever dates change
  useEffect(() => {
    if (!startDate || !endDate) return;
    
    const fetchReportingData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // 1. Fetch orders in date range with nested items and products
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*, order_items(*, product:products(*))')
          .gte('created_at', startDate + 'T00:00:00Z')
          .lte('created_at', endDate + 'T23:59:59Z')
          .order('created_at', { ascending: true });

        if (ordersError) throw ordersError;
        const currentOrders: Order[] = ordersData || [];
        setOrders(currentOrders);

        // 2. Fetch staff profiles to resolve cashier names
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['admin', 'staff']);
        setStaff(staffData || []);

        // 3. Attempt to fetch Daily Revenue from Supabase RPC
        const { data: rpcDaily, error: rpcDailyError } = await supabase
          .rpc('get_daily_revenue', { start_date: startDate, end_date: endDate });

        if (!rpcDailyError && rpcDaily) {
          setDailyRevenue(rpcDaily);
        } else {
          // Fallback: Aggregate Daily Revenue Client-Side
          setDailyRevenue(aggregateDailyRevenueFallback(currentOrders, startDate, endDate));
        }

        // 4. Attempt to fetch Top Products from Supabase RPC
        const { data: rpcProducts, error: rpcProductsError } = await supabase
          .rpc('get_top_products', { start_date: startDate, end_date: endDate });

        if (!rpcProductsError && rpcProducts) {
          setTopProducts(rpcProducts);
        } else {
          // Fallback: Aggregate Top Products Client-Side
          setTopProducts(aggregateTopProductsFallback(currentOrders));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchReportingData();
  }, [startDate, endDate, supabase]);

  // Adjust dates based on preset selection
  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    
    if (preset === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      // Start of current week (Sunday)
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - today.getDay());
      setStartDate(sunday.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // --- CLIENT-SIDE AGGREGATION FALLBACKS ---

  const aggregateDailyRevenueFallback = (ordersList: Order[], startStr: string, endStr: string) => {
    // Generate dates in range
    const dailyMap: { [key: string]: { sale_date: string, delivery_revenue: number, pickup_revenue: number, total_revenue: number, order_count: number } } = {};
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = {
        sale_date: dateStr,
        delivery_revenue: 0,
        pickup_revenue: 0,
        total_revenue: 0,
        order_count: 0
      };
    }

    ordersList.forEach(order => {
      if (order.status === 'Cancelled') return;
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].order_count += 1;
        dailyMap[dateStr].total_revenue += Number(order.total);
        if (order.fulfillment_method === 'Delivery') {
          dailyMap[dateStr].delivery_revenue += Number(order.total);
        } else {
          dailyMap[dateStr].pickup_revenue += Number(order.total);
        }
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.sale_date.localeCompare(b.sale_date));
  };

  const aggregateTopProductsFallback = (ordersList: Order[]) => {
    const productsMap: { [key: string]: { product_id: string, product_name: string, sku: string, image_url: string | null, units_sold: number, revenue: number, current_stock: number } } = {};

    ordersList.forEach(order => {
      if (order.status === 'Cancelled') return;
      if (!order.order_items) return;
      
      order.order_items.forEach(item => {
        const pId = item.product_id;
        if (!productsMap[pId]) {
          productsMap[pId] = {
            product_id: pId,
            product_name: item.product?.name || 'Unknown',
            sku: item.product?.sku || 'N/A',
            image_url: item.product?.image_url || null,
            units_sold: 0,
            revenue: 0,
            current_stock: item.product?.quantity || 0
          };
        }
        productsMap[pId].units_sold += item.quantity;
        productsMap[pId].revenue += item.quantity * Number(item.unit_price);
      });
    });

    return Object.values(productsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  // --- STATS CALCULATIONS ---

  // Sales KPIs
  const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = orders.length;
  const avgOrderValue = nonCancelledOrders.length > 0 ? totalRevenue / nonCancelledOrders.length : 0;
  
  const totalItemsSold = nonCancelledOrders.reduce((sum, o) => {
    return sum + (o.order_items?.reduce((s, item) => s + item.quantity, 0) || 0);
  }, 0);

  // Revenue by fulfillment
  const deliveryRev = nonCancelledOrders.filter(o => o.fulfillment_method === 'Delivery').reduce((sum, o) => sum + Number(o.total), 0);
  const pickupRev = nonCancelledOrders.filter(o => o.fulfillment_method === 'Store Pickup').reduce((sum, o) => sum + Number(o.total), 0);
  
  const deliveryPct = totalRevenue > 0 ? (deliveryRev / totalRevenue) * 100 : 0;
  const pickupPct = totalRevenue > 0 ? (pickupRev / totalRevenue) * 100 : 0;

  // Order Status Pie/Donut Chart Data
  const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
  const statusColors = ['#e2a535', '#a8b347', '#BEC96A', '#b8860b', '#10b981', '#ef4444'];
  const pieData = orderStatuses.map((status, index) => {
    const count = orders.filter(o => o.status === status).length;
    const value = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
    return {
      name: status,
      count,
      value: Math.round(value * 10) / 10,
      color: statusColors[index]
    };
  }).filter(d => d.count > 0);

  // Staff POS Sales performance
  const staffPerformance = staff.map(st => {
    const staffPosOrders = nonCancelledOrders.filter(o => o.cashier_id === st.id);
    const revenue = staffPosOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgSale = staffPosOrders.length > 0 ? revenue / staffPosOrders.length : 0;

    return {
      name: st.full_name || 'Staff Member',
      ordersProcessed: staffPosOrders.length,
      revenue,
      avgSale
    };
  }).filter(s => s.ordersProcessed > 0).sort((a, b) => b.revenue - a.revenue);

  // CSV Export Trigger
  const handleExportCSV = () => {
    const headers = [
      'Order ID', 'Date', 'Customer Name', 'Phone', 'Email', 
      'Items Count', 'Subtotal', 'Delivery Charge', 'Total', 
      'Status', 'Fulfillment', 'Payment Method', 'Cashier Name'
    ];

    const rows = orders.map(order => {
      const itemsCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
      const cashierProfile = staff.find(s => s.id === order.cashier_id);
      const cashierName = cashierProfile ? cashierProfile.full_name : order.cashier_id ? 'Unknown' : 'Storefront Guest';
      
      return [
        order.id,
        new Date(order.created_at).toLocaleDateString(),
        order.customer_name,
        order.customer_phone,
        order.customer_email,
        itemsCount,
        order.subtotal,
        order.delivery_charge,
        order.total,
        order.status,
        order.fulfillment_method,
        order.payment_method || 'Online',
        cashierName
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' // include BOM for excel compatibility
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chrish_flora_sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formats dailyRevenue values for Charting
  const chartData = dailyRevenue.map(d => ({
    date: new Date(d.sale_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    delivery: Number(d.delivery_revenue || 0),
    pickup: Number(d.pickup_revenue || 0),
    total: Number(d.total_revenue || 0)
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-gray-800">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-3xl text-flora-brown">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyze business sales trends, product metrics, and cashier performance.
          </p>
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExportCSV}
          disabled={orders.length === 0}
          className="btn-gold flex items-center gap-2 px-4 py-2 text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={16} />
          Export CSV Report
        </button>
      </div>

      {/* Date Pickers & Range selectors */}
      <div className="bg-white border border-gray-200 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide scroll-touch w-full md:w-auto">
          {(['today', 'week', 'month', 'custom'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors uppercase tracking-wider
                ${datePreset === preset
                  ? 'bg-gold-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {preset}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-gold-500 text-gray-700"
              />
            </div>
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-gold-500 text-gray-700"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 text-sm rounded">
          {error}
        </div>
      )}

      {/* SECTION 1: Sales Overview (KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card 1 */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-lg shadow-sm flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4">
          <div className="p-3 bg-gold-50 text-gold-600 rounded-full shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider truncate">Total Revenue</p>
            <h3 className="price-display text-base sm:text-2xl text-[#5C4A00] font-bold mt-1 truncate">
              LKR {totalRevenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        {/* KPI Card 2 */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-lg shadow-sm flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4">
          <div className="p-3 bg-olive-50 text-olive-600 rounded-full shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider truncate">Total Orders</p>
            <h3 className="font-serif text-base sm:text-2xl text-flora-brown font-bold mt-1">
              {totalOrders}
            </h3>
          </div>
        </div>

        {/* KPI Card 3 */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-lg shadow-sm flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-full shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider truncate">Avg Sale</p>
            <h3 className="price-display text-base sm:text-2xl text-[#5C4A00] font-bold mt-1 truncate">
              LKR {avgOrderValue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        {/* KPI Card 4 */}
        <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-lg shadow-sm flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-4">
          <div className="p-3 bg-flora-cream-dark text-flora-brown rounded-full shrink-0">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider truncate">Items Sold</p>
            <h3 className="font-serif text-base sm:text-2xl text-flora-brown font-bold mt-1">
              {totalItemsSold}
            </h3>
          </div>
        </div>
      </div>

      {/* Fulfillment breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col justify-between">
          <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Delivery Revenue</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="price-display text-3xl font-bold text-[#5C4A00]">
              LKR {deliveryRev.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h4>
            <span className="font-mono text-sm bg-olive-50 text-olive-700 px-2.5 py-0.5 rounded font-bold">
              {deliveryPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-olive-400 h-full" style={{ width: `${deliveryPct}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col justify-between">
          <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Store Pickup Revenue</p>
          <div className="mt-2 flex items-baseline justify-between">
            <h4 className="price-display text-3xl font-bold text-[#5C4A00]">
              LKR {pickupRev.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h4>
            <span className="font-mono text-sm bg-gold-50 text-gold-700 px-2.5 py-0.5 rounded font-bold">
              {pickupPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-gold-500 h-full" style={{ width: `${pickupPct}%` }} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 2: Revenue Trend Stacked Bar Chart */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm lg:col-span-2">
            <h3 className="font-serif text-lg text-flora-brown font-semibold mb-4">Revenue Chart</h3>
            <div className="h-[220px] md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#FBF7EE', border: '1px solid #C9962A', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '12px' }}
                    labelStyle={{ fontFamily: 'serif', fontWeight: 'bold', color: '#5C4A00' }}
                    formatter={(value: any) => [`LKR ${Number(value).toLocaleString('en-LK')}`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <Bar dataKey="delivery" name="Delivery" stackId="a" fill="#BEC96A" />
                  <Bar dataKey="pickup" name="Store Pickup" stackId="a" fill="#C9962A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 4: Status donut chart */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
            <h3 className="font-serif text-lg text-flora-brown font-semibold mb-4">Order Status Breakdown</h3>
            <div className="h-[220px] md:h-60 w-full flex items-center justify-center relative">
              {pieData.length === 0 ? (
                <p className="text-gray-400 text-sm italic font-serif">No sales recorded</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Orders`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status legends list */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 truncate">{item.name}</span>
                  <span className="font-mono text-[10px] text-gray-400 ml-auto font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tables Section: Top Products & Staff Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Top Products */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
          <h3 className="font-serif text-lg text-flora-brown font-semibold mb-4">Top 10 Selling Products</h3>
          <div className="overflow-x-auto">
            {/* Desktop Table view */}
            <table className="hidden sm:table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4 text-center">Units Sold</th>
                  <th className="py-2.5 px-4 text-right">Revenue</th>
                  <th className="py-2.5 px-4 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-serif italic">
                      No product sales in range.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, index) => {
                    const isOutOfStock = p.current_stock <= 0;
                    return (
                      <tr key={p.product_id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-center font-bold text-gray-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded border bg-gray-50 overflow-hidden shrink-0">
                              {p.image_url ? (
                                <Image
                                  src={p.image_url}
                                  alt={p.product_name}
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-400">
                                  No
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-serif font-semibold text-flora-brown truncate">{p.product_name}</p>
                              <p className="text-[9px] text-gray-400 font-mono mt-0.5">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {p.units_sold}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-baseline justify-end gap-0.5 font-sans">
                            <span className="text-[10px] text-gold-600/70">LKR</span>
                            <span className="price-small text-gold-600">
                              {Number(p.revenue).toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full
                            ${isOutOfStock 
                              ? 'bg-red-500' 
                              : p.current_stock < 5 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'}`}
                            title={`Stock: ${p.current_stock}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile Card List view */}
            <div className="sm:hidden space-y-3">
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-gray-400 font-serif italic text-xs">
                  No product sales in range.
                </p>
              ) : (
                topProducts.map((p, index) => {
                  const isOutOfStock = p.current_stock <= 0;
                  return (
                    <div key={p.product_id} className="bg-gray-50 border border-gray-100 p-3 rounded flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold text-gray-400 w-4 text-center">{index + 1}</span>
                        <div className="relative w-10 h-10 rounded border bg-white overflow-hidden shrink-0">
                          {p.image_url ? (
                            <Image
                              src={p.image_url}
                              alt={p.product_name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-400">
                              No
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif font-semibold text-flora-brown truncate">{p.product_name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-mono">Stock:</span>
                            <span className={`inline-block w-2 h-2 rounded-full
                              ${isOutOfStock 
                                ? 'bg-red-500' 
                                : p.current_stock < 5 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-500'}`}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-gray-800">{p.units_sold} sold</p>
                        <div className="flex items-baseline justify-end gap-0.5 font-sans mt-0.5">
                          <span className="text-[10px] text-gold-600/70">LKR</span>
                          <span className="price-small text-gold-600">
                            {Number(p.revenue).toLocaleString('en-LK')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Staff Performance (POS cashier_id != null) */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
          <h3 className="font-serif text-lg text-flora-brown font-semibold mb-4">Staff Performance (POS Sales)</h3>
          <div className="overflow-x-auto">
            {/* Desktop Table view */}
            <table className="hidden sm:table w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Staff Name</th>
                  <th className="py-2.5 px-4 text-center">Orders Processed</th>
                  <th className="py-2.5 px-4 text-right">Revenue Generated</th>
                  <th className="py-2.5 px-4 text-right">Average Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {staffPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-serif italic">
                      No POS sales processed by staff in range.
                    </td>
                  </tr>
                ) : (
                  staffPerformance.map(st => (
                    <tr key={st.name} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-serif font-semibold text-flora-brown">
                        {st.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {st.ordersProcessed}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-baseline justify-end gap-0.5 font-sans">
                          <span className="text-[10px] text-gray-400">LKR</span>
                          <span className="price-small text-gray-700">
                            {st.revenue.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-baseline justify-end gap-0.5 font-sans">
                          <span className="text-[10px] text-gold-600/70">LKR</span>
                          <span className="price-small text-gold-600">
                            {st.avgSale.toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile Card List view */}
            <div className="sm:hidden space-y-3">
              {staffPerformance.length === 0 ? (
                <p className="py-8 text-center text-gray-400 font-serif italic text-xs">
                  No POS sales processed by staff in range.
                </p>
              ) : (
                staffPerformance.map(st => (
                  <div key={st.name} className="bg-gray-50 border border-gray-100 p-3 rounded text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-semibold text-flora-brown text-sm">{st.name}</span>
                      <span className="bg-white px-2 py-0.5 border border-gray-200 rounded font-mono text-[10px] text-gray-600 font-semibold">
                        {st.ordersProcessed} Orders
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Revenue Generated:</span>
                      <div className="flex items-baseline gap-0.5 font-sans">
                        <span className="text-[10px] text-gray-400">LKR</span>
                        <span className="price-small text-gray-800">
                          {st.revenue.toLocaleString('en-LK')}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-gray-500 border-t border-gray-100 pt-1.5">
                      <span>Avg. Order Value:</span>
                      <div className="flex items-baseline gap-0.5 font-sans">
                        <span className="text-[10px] text-gold-600/70">LKR</span>
                        <span className="price-small text-gold-600">
                          {st.avgSale.toLocaleString('en-LK')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
