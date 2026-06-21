'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  DollarSign, TrendingUp, BarChart2, Clock, Search, Download, Eye, Printer, 
  FileText, MapPin, User, Mail, Phone, X, Receipt, ChevronLeft, ChevronRight, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderStatus } from '@/types';
import OrderStatusBadge from './OrderStatusBadge';
import { formatPhoneForWhatsApp, generateReceiptMessage, shareOnWhatsApp } from '@/lib/whatsapp';

interface Props {
  initialOrders: Order[];
  storeSettings?: any;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'
];

export default function SalesClient({ initialOrders, storeSettings }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Real-time updates subscription
  const supabase = createClient();
  useEffect(() => {
    const channel = supabase
      .channel('sales-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // Refetch orders with items and products
        supabase
          .from('orders')
          .select('*, order_items(*, product:products(name, sku, image_url), order_item_addons(*))')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setOrders(data);
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<string>('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Helper: Derived Payment Status
  const getPaymentStatus = (order: Order): 'Paid' | 'Pending' | 'Failed' => {
    if ((order as any).payment_status) return (order as any).payment_status;
    if (order.status === 'Cancelled') return 'Failed';
    if (order.status === 'Pending') return 'Pending';
    return 'Paid';
  };

  // Helper: Reset Page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, datePreset, customStartDate, customEndDate, statusFilter, fulfillmentFilter, paymentFilter, paymentStatusFilter, sortBy]);

  // Date Presets Handler
  const filterByDate = (orderDateStr: string) => {
    if (datePreset === 'all') return true;
    const orderDate = new Date(orderDateStr);
    const today = new Date();
    
    if (datePreset === 'today') {
      return orderDate.toDateString() === today.toDateString();
    }
    
    if (datePreset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    }
    
    if (datePreset === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      return orderDate >= startOfWeek;
    }
    
    if (datePreset === 'month') {
      return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    }
    
    if (datePreset === 'lastMonth') {
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
    }
    
    if (datePreset === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(0);
      const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date();
      return orderDate >= start && orderDate <= end;
    }
    
    return true;
  };

  // Filter & Sort Logic
  const filteredOrders = orders.filter(o => {
    // 1. Text Search
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      o.id.toLowerCase().includes(searchLower) ||
      o.customer_name.toLowerCase().includes(searchLower) ||
      o.customer_phone.toLowerCase().includes(searchLower) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(searchLower));

    // 2. Date presets
    const matchesDate = filterByDate(o.created_at);

    // 3. Status filter
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

    // 4. Fulfillment filter
    const matchesFulfillment = fulfillmentFilter === 'All' || o.fulfillment_method === fulfillmentFilter;

    // 5. Payment Method filter
    const matchesPayment = paymentFilter === 'All' || (o.payment_method || 'Online') === paymentFilter;

    // 6. Payment Status filter
    const payStatus = getPaymentStatus(o);
    const matchesPaymentStatus = paymentStatusFilter === 'All' || payStatus === paymentStatusFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesFulfillment && matchesPayment && matchesPaymentStatus;
  });

  // Sort Logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'highest') {
      return b.total - a.total;
    }
    if (sortBy === 'lowest') {
      return a.total - b.total;
    }
    return 0;
  });

  // Paginated Results
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Status updates
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null);
  };

  // Bulk Actions Checkboxes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // --- STATS CALCULATIONS (Based on filtered orders) ---
  const nonCancelledFiltered = filteredOrders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = nonCancelledFiltered.reduce((sum, o) => sum + o.total, 0);
  const totalCount = filteredOrders.length;
  
  // Today's Sales
  const todayOrders = filteredOrders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayTotal = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const todayCount = todayOrders.length;

  // Average order value
  const avgOrder = nonCancelledFiltered.length > 0 ? totalRevenue / nonCancelledFiltered.length : 0;

  // Pending Payments
  const pendingOrders = filteredOrders.filter(o => getPaymentStatus(o) === 'Pending');
  const pendingTotal = pendingOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingCount = pendingOrders.length;

  // --- SUMMARY CHART AGGREGATIONS ---
  // 1. Payment Methods percentages
  const cashCount = filteredOrders.filter(o => o.payment_method === 'Cash').length;
  const cardCount = filteredOrders.filter(o => o.payment_method === 'Card').length;
  const qrCount = filteredOrders.filter(o => o.payment_method === 'QR').length;
  const payHereCount = filteredOrders.filter(o => !o.payment_method || o.payment_method === 'Online' || (o.payment_method as string) === 'PayHere').length;

  const totalPayMethods = cashCount + cardCount + qrCount + payHereCount;
  const cashPercent = totalPayMethods > 0 ? Math.round((cashCount / totalPayMethods) * 100) : 0;
  const cardPercent = totalPayMethods > 0 ? Math.round((cardCount / totalPayMethods) * 100) : 0;
  const qrPercent = totalPayMethods > 0 ? Math.round((qrCount / totalPayMethods) * 100) : 0;
  const payherePercent = totalPayMethods > 0 ? Math.round((payHereCount / totalPayMethods) * 100) : 0;

  // 2. Order Status Breakdown
  const deliveredCount = filteredOrders.filter(o => o.status === 'Delivered').length;
  const processingCount = filteredOrders.filter(o => o.status === 'Processing' || o.status === 'Confirmed').length;
  const pendingStatusCount = filteredOrders.filter(o => o.status === 'Pending').length;
  const cancelledCount = filteredOrders.filter(o => o.status === 'Cancelled').length;

  const totalStatus = deliveredCount + processingCount + pendingStatusCount + cancelledCount;
  const deliveredPercent = totalStatus > 0 ? Math.round((deliveredCount / totalStatus) * 100) : 0;
  const processingPercent = totalStatus > 0 ? Math.round((processingCount / totalStatus) * 100) : 0;
  const pendingStatusPercent = totalStatus > 0 ? Math.round((pendingStatusCount / totalStatus) * 100) : 0;
  const cancelledPercent = totalStatus > 0 ? Math.round((cancelledCount / totalStatus) * 100) : 0;

  // 3. Fulfillment Split
  const deliveryCount = filteredOrders.filter(o => o.fulfillment_method === 'Delivery').length;
  const pickupCount = filteredOrders.filter(o => o.fulfillment_method === 'Store Pickup').length;

  // --- Thermal Receipt Printing Helper ---
  const printReceipt = (order: Order) => {
    const cashierName = order.cashier_id ? 'Cashier Staff' : 'Storefront Guest';
    const itemsListHTML = (order.order_items || []).map(item => {
      const addonLines = (item.order_item_addons || [])
        .map(oa => `
          <div class="row" style="padding-left:12px; color:#666; font-size:10px;">
            <span>↳ ${oa.addon_name}</span>
            <span class="tabular">+LKR ${Number(oa.addon_price).toLocaleString('en-LK')}</span>
          </div>
        `).join('');

      return `
        <div class="row">
          <span class="item-name">${item.product?.name || 'Flower Arrangement'}</span>
          <span>&times;${item.quantity}</span>
          <span class="tabular">LKR ${(item.quantity * item.unit_price).toLocaleString('en-LK')}</span>
        </div>
        <div style="color:#666;font-size:9px;margin-bottom:6px">
          ${item.product?.sku || ''}
        </div>
        ${addonLines}
      `;
    }).join('');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.id.slice(0, 8)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
            width: 80mm;
            padding: 8mm 4mm;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .gold { color: #C9962A; }
          .divider { 
            border-top: 1px dashed #777; 
            margin: 8px 0; 
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .total-row { 
            font-size: 13px; 
            font-weight: bold; 
            margin-top: 6px; 
          }
          .header { margin-bottom: 10px; }
          .logo { font-size: 16px; font-weight: bold; font-family: Georgia, serif; }
          .item-name { flex: 1; padding-right: 8px; }
          .tabular { font-variant-numeric: tabular-nums; }
          @media print {
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="logo gold">Chrish Flora</div>
          <div>Luxury Floral Boutique</div>
          <div>Colombo, Sri Lanka</div>
          <div>chrishflora.com</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="row">
          <span>Order ID:</span>
          <span class="bold">#${order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div class="row">
          <span>Date:</span>
          <span>${new Date(order.created_at).toLocaleDateString('en-LK')}</span>
        </div>
        <div class="row">
          <span>Time:</span>
          <span>${new Date(order.created_at).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="row">
          <span>Customer:</span>
          <span>${order.customer_name}</span>
        </div>
        <div class="row">
          <span>Phone:</span>
          <span>${order.customer_phone}</span>
        </div>
        <div class="row">
          <span>Fulfillment:</span>
          <span>${order.fulfillment_method}</span>
        </div>
        ${order.requested_delivery_date ? `
        <div class="row">
          <span>Req. Date:</span>
          <span class="bold">${order.requested_delivery_date}</span>
        </div>
        ` : ''}
        ${order.requested_delivery_time ? `
        <div class="row">
          <span>Req. Time:</span>
          <span class="bold">${order.requested_delivery_time}</span>
        </div>
        ` : ''}
        <div class="row">
          <span>Payment:</span>
          <span>${order.payment_method || 'Online'}</span>
        </div>
        <div class="row">
          <span>Cashier:</span>
          <span>${cashierName}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="bold" style="margin-bottom:6px">ITEMS</div>
        ${itemsListHTML}
        
        <div class="divider"></div>
        
        <div class="row">
          <span>Subtotal</span>
          <span class="tabular">LKR ${order.subtotal.toLocaleString('en-LK')}</span>
        </div>
        <div class="row">
          <span>Delivery</span>
          <span class="tabular">LKR ${order.delivery_charge.toLocaleString('en-LK')}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="row total-row">
          <span>TOTAL</span>
          <span class="tabular gold font-bold">LKR ${order.total.toLocaleString('en-LK')}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="center" style="margin-top:10px">
          <div class="gold bold" style="font-size:12px">Thank You!</div>
          <div style="font-size:9px;color:#555">Please retain this receipt for returns or exchanges.</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  // --- Export CSV Helper ---
  const handleExportCSV = () => {
    const headers = [
      'Order ID', 'Date', 'Time', 'Customer Name',
      'Customer Phone', 'Customer Email',
      'Fulfillment', 'Delivery Address',
      'Distance (km)', 'Items Count',
      'Subtotal (LKR)', 'Delivery Charge (LKR)',
      'Total (LKR)', 'Payment Method',
      'Payment Status', 'Order Status',
      'Order Notes', 'Cashier'
    ];
    
    const rows = filteredOrders.map(o => [
      o.id.slice(0, 8).toUpperCase(),
      new Date(o.created_at).toLocaleDateString('en-LK'),
      new Date(o.created_at).toLocaleTimeString('en-LK'),
      o.customer_name,
      o.customer_phone,
      o.customer_email || '',
      o.fulfillment_method,
      o.delivery_address || '',
      o.delivery_distance_km?.toFixed(2) || '0',
      (o.order_items?.length || 0).toString(),
      o.subtotal.toString(),
      o.delivery_charge.toString(),
      o.total.toString(),
      o.payment_method || 'Online',
      getPaymentStatus(o),
      o.status,
      o.order_note || '',
      o.cashier_id ? 'POS' : 'Online',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => 
          `"${String(cell).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chrish-flora-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-gray-800">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-flora-brown">Sales History</h1>
          <p className="text-sm text-gray-500 font-sans mt-0.5">
            Audit transactions, review financial summaries, re-order sales, and export logs.
          </p>
        </div>
      </div>

      {/* 2. Top Stats KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Card 1: Total Revenue */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-gold rounded-full shrink-0">
            <DollarSign size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Total Revenue</p>
            <h3 className="price-display text-xl sm:text-2xl text-gold-700 font-bold mt-0.5">
              LKR {totalRevenue.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">{totalCount} transactions</p>
          </div>
        </div>

        {/* KPI Card 2: Today's Sales */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Today's Sales</p>
            <h3 className="price-display text-xl sm:text-2xl text-[#5C4A00] font-bold mt-0.5">
              LKR {todayTotal.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">{todayCount} orders today</p>
          </div>
        </div>

        {/* KPI Card 3: Average Order */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-full shrink-0">
            <BarChart2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Average Order</p>
            <h3 className="price-display text-xl sm:text-2xl text-[#5C4A00] font-bold mt-0.5">
              LKR {avgOrder.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">Per transaction</p>
          </div>
        </div>

        {/* KPI Card 4: Pending / Unpaid */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-red-50 text-red-500 rounded-full shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-sans text-gray-400 uppercase font-semibold tracking-wider">Pending / Unpaid</p>
            <h3 className="price-display text-xl sm:text-2xl text-red-700 font-bold mt-0.5">
              LKR {pendingTotal.toLocaleString('en-LK', { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">{pendingCount} orders</p>
          </div>
        </div>
      </div>

      {/* 3. Filter Options Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-4">
        {/* Row 1: Search & Date preset pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3 text-gold-600" size={16} />
            <input
              type="text"
              placeholder="Search by Order ID, Customer name, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-1 focus:ring-gold text-sm text-gray-800 h-10 placeholder-gray-400"
            />
          </div>

          {/* Date range presets */}
          <div className="flex flex-wrap gap-1.5 shrink-0 select-none">
            {([
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'lastMonth', label: 'Last Month' },
              { key: 'custom', label: 'Custom Range' },
            ] as const).map(preset => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setDatePreset(preset.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-sans font-medium transition-colors tracking-wide h-10
                  ${datePreset === preset.key
                    ? 'bg-gold-600 text-white shadow-sm font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Datepicker inputs */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs shrink-0 select-none">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="border-0 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold h-10 text-gray-700 font-mono"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="border-0 bg-gray-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gold h-10 text-gray-700 font-mono"
              />
            </div>
          )}
        </div>

        {/* Row 2: Select drop selectors and CSV export trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-xs h-10 font-sans focus:outline-none focus:ring-1 focus:ring-gold text-gray-600"
            >
              <option value="All">All Statuses</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Fulfillment Selector */}
            <select
              value={fulfillmentFilter}
              onChange={e => setFulfillmentFilter(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-xs h-10 font-sans focus:outline-none focus:ring-1 focus:ring-gold text-gray-600"
            >
              <option value="All">All Fulfillments</option>
              <option value="Delivery">🚚 Delivery</option>
              <option value="Store Pickup">🏪 Store Pickup</option>
            </select>

            {/* Payment Method Selector */}
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-xs h-10 font-sans focus:outline-none focus:ring-1 focus:ring-gold text-gray-600"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="QR">QR Code</option>
              <option value="Online">Online / PayHere</option>
            </select>

            {/* Payment Status Selector */}
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-xs h-10 font-sans focus:outline-none focus:ring-1 focus:ring-gold text-gray-600"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>

            {/* Sorting Selector */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-gray-50 border-0 rounded-xl px-3 py-2 text-xs h-10 font-sans focus:outline-none focus:ring-1 focus:ring-gold text-gray-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <span className="text-[11px] text-gray-400 font-sans font-medium">
              Showing {sortedOrders.length} of {orders.length} orders
            </span>

            <button
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center gap-2 h-10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* 4. Aggregation Breakdown Metrics Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 className="font-serif text-sm font-bold text-flora-brown uppercase tracking-wider">Payment Methods</h3>
          <div className="space-y-2.5 font-sans text-xs">
            {[
              { label: 'Cash', percent: cashPercent, color: 'bg-emerald-500' },
              { label: 'Card', percent: cardPercent, color: 'bg-blue-500' },
              { label: 'QR', percent: qrPercent, color: 'bg-purple-500' },
              { label: 'Online / PayHere', percent: payherePercent, color: 'bg-gold' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-24 text-gray-600 font-medium truncate">{item.label}</span>
                <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
                <span className="w-8 text-right font-mono font-bold text-gray-500">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 className="font-serif text-sm font-bold text-flora-brown uppercase tracking-wider">Order Status</h3>
          <div className="space-y-2.5 font-sans text-xs">
            {[
              { label: 'Delivered', percent: deliveredPercent, color: 'bg-green-500' },
              { label: 'Processing', percent: processingPercent, color: 'bg-purple-500' },
              { label: 'Pending', percent: pendingStatusPercent, color: 'bg-amber-500' },
              { label: 'Cancelled', percent: cancelledPercent, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-20 text-gray-600 font-medium truncate">{item.label}</span>
                <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
                <span className="w-8 text-right font-mono font-bold text-gray-500">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fulfillment Breakdown Split */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <h3 className="font-serif text-sm font-bold text-flora-brown uppercase tracking-wider mb-2">Fulfillment Mode</h3>
          
          <div className="flex items-center justify-between flex-1 py-1">
            <div className="text-center flex-1">
              <h4 className="font-serif text-2xl font-bold text-gold-700">{deliveryCount}</h4>
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-1">Deliveries</p>
            </div>
            
            <div className="w-[1px] bg-gray-100 h-14" />
            
            <div className="text-center flex-1">
              <h4 className="font-serif text-2xl font-bold text-olive-700">{pickupCount}</h4>
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-1">Pickups</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Main Desktop Sales Table */}
      <div className="hidden lg:block bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] tracking-[0.15em] uppercase text-gray-400 font-medium">
              <th className="px-4 py-3.5 text-center w-12">
                <button
                  onClick={() => handleSelectAll(selectedIds.length !== paginatedOrders.length)}
                  className="text-gray-400 hover:text-gold transition-colors focus:outline-none"
                >
                  {selectedIds.length === paginatedOrders.length ? (
                    <CheckSquare size={16} className="text-gold-600" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3.5 text-left">Order ID</th>
              <th className="px-4 py-3.5 text-left">Date & Time</th>
              <th className="px-4 py-3.5 text-left">Customer</th>
              <th className="px-4 py-3.5 text-left">Items</th>
              <th className="px-4 py-3.5 text-left">Fulfillment</th>
              <th className="px-4 py-3.5 text-left">Payment</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-right">Amount</th>
              <th className="px-4 py-3.5 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedOrders.map(order => {
              const isSelected = selectedIds.includes(order.id);
              const itemsCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0;
              const isPosSale = !!order.cashier_id;
              const orderDate = new Date(order.created_at);
              const payStatus = getPaymentStatus(order);

              // Gather item product thumbnail previews (max 3)
              const thumbnails = (order.order_items || [])
                .map(item => item.product?.image_url)
                .filter(Boolean) as string[];
              const uniqueThumbnails = Array.from(new Set(thumbnails));

              return (
                <tr 
                  key={order.id}
                  onClick={() => setSelected(order)}
                  className={`hover:bg-gold-50/20 cursor-pointer transition-colors ${
                    isSelected ? 'bg-gold-50/10' : ''
                  }`}
                >
                  {/* Checkbox select cells */}
                  <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleSelectOne(order.id, !isSelected)}
                      className="text-gray-400 hover:text-gold transition-colors focus:outline-none"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-gold-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </td>

                  {/* Order ID */}
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-semibold text-gray-800">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <div className="mt-1">
                      {isPosSale ? (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase font-sans">
                          POS
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase font-sans">
                          ONLINE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="px-4 py-4">
                    <p className="text-xs font-semibold text-gray-800">
                      {orderDate.toLocaleDateString('en-LK', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {orderDate.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>

                  {/* Customer details */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-olive-100 flex items-center justify-center font-serif text-xs font-bold text-gold-700 shrink-0 border border-white">
                        {order.customer_name[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">{order.customer_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-gray-400 font-mono">{order.customer_phone}</span>
                          {order.customer_phone && order.customer_phone !== 'N/A' && (
                            <button
                              onClick={() => {
                                const msg = `🌸 Hello ${order.customer_name}! Receipt update for Order (${order.id.slice(0, 8).toUpperCase()}): Status: ${order.status}. Thank you! 🌸`;
                                window.open(`https://wa.me/${formatPhoneForWhatsApp(order.customer_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="text-emerald-500 hover:text-emerald-600 transition-colors"
                              title="WhatsApp Update"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Items list */}
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {/* Product overlap circular previews */}
                      <div className="flex items-center mr-2">
                        {uniqueThumbnails.slice(0, 3).map((url, i) => (
                          <div
                            key={i}
                            className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-white -ml-1.5 first:ml-0 bg-gray-100"
                          >
                            <Image src={url} alt="Item thumb" fill className="object-cover" sizes="24px" />
                          </div>
                        ))}
                        {uniqueThumbnails.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gold text-white border-2 border-white -ml-1.5 flex items-center justify-center font-bold font-sans text-[8px]">
                            +{uniqueThumbnails.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-semibold">{itemsCount} items</span>
                    </div>
                  </td>

                  {/* Fulfillment */}
                  <td className="px-4 py-4 text-xs font-semibold text-gray-600">
                    {order.fulfillment_method === 'Delivery' ? (
                      <span className="flex items-center gap-1">🚚 Delivery</span>
                    ) : (
                      <span className="flex items-center gap-1">🏪 Pickup</span>
                    )}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-4">
                    <div>
                      {/* Method Badge */}
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded uppercase
                        ${order.payment_method === 'Cash' ? 'bg-gray-100 text-gray-700' :
                          order.payment_method === 'Card' ? 'bg-blue-100 text-blue-800' :
                          order.payment_method === 'QR' ? 'bg-purple-100 text-purple-800' :
                          'bg-gold-50 text-gold-800 border border-gold-100'
                        }`}
                      >
                        {order.payment_method || 'Online'}
                      </span>
                      
                      {/* Status indicator */}
                      <div className="mt-1 font-semibold">
                        {payStatus === 'Paid' ? (
                          <span className="text-[10px] text-green-600 font-sans flex items-center gap-0.5">✓ Paid</span>
                        ) : payStatus === 'Pending' ? (
                          <span className="text-[10px] text-amber-600 font-sans flex items-center gap-0.5">⏳ Pending</span>
                        ) : (
                          <span className="text-[10px] text-red-500 font-sans flex items-center gap-0.5">✗ Failed</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-4 text-center">
                    <OrderStatusBadge status={order.status} />
                  </td>

                  {/* Grand Total Amount */}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-baseline justify-end gap-0.5 font-sans">
                      <span className="text-[10px] text-gold-600/70">LKR</span>
                      <span className="price-small text-gold-600">
                        {order.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {/* View Eye Button */}
                      <button
                        onClick={() => setSelected(order)}
                        className="p-1.5 text-gray-400 hover:text-gold-600 hover:bg-gray-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => {
                          const msg = generateReceiptMessage({
                            orderId: order.id,
                            customerName: order.customer_name,
                            items: (order.order_items || []).map(item => ({
                              name: item.product?.name || 'Flower arrangement',
                              quantity: item.quantity,
                              unitPrice: item.unit_price,
                              order_item_addons: item.order_item_addons || [],
                            })),
                            subtotal: order.subtotal,
                            deliveryCharge: order.delivery_charge,
                            grandTotal: order.total,
                            fulfillment: order.fulfillment_method,
                            paymentMethod: order.payment_method || 'Online',
                            cashierName: order.cashier_id ? 'Cashier Staff' : 'Storefront Guest',
                            dateTime: new Date(order.created_at).toLocaleString('en-LK', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            }),
                          });
                          
                          if (!order.customer_phone || order.customer_phone.trim() === '' || order.customer_phone === 'N/A') {
                            navigator.clipboard?.writeText(msg);
                            alert('No phone number available! Receipt text copied to clipboard instead.');
                            return;
                          }
                          shareOnWhatsApp(order.customer_phone, msg);
                        }}
                        className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                        title="Share on WhatsApp"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>

                      {/* Print receipt button */}
                      <button
                        onClick={() => printReceipt(order)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Print Receipt"
                      >
                        <Printer size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedOrders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-400 font-serif italic">
                  No sales transactions matching filters found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Mobile Card List (Viewport < 1024px) */}
      <div className="lg:hidden space-y-3">
        {paginatedOrders.map(order => {
          const isPosSale = !!order.cashier_id;
          const orderDate = new Date(order.created_at);
          
          return (
            <div
              key={order.id}
              onClick={() => setSelected(order)}
              className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3 cursor-pointer hover:shadow transition-shadow"
            >
              {/* Top Row: ID & Status Badge */}
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-semibold text-gray-800">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  {isPosSale ? (
                    <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.5 rounded font-sans">POS</span>
                  ) : (
                    <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1 py-0.5 rounded font-sans">ONLINE</span>
                  )}
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>

              {/* Middle Row: Customer name & phone */}
              <div className="flex justify-between items-center text-xs">
                <div>
                  <h3 className="font-semibold text-flora-brown">{order.customer_name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5" onClick={e => e.stopPropagation()}>
                    <span className="text-gray-400 font-mono">{order.customer_phone}</span>
                    {order.customer_phone && order.customer_phone !== 'N/A' && (
                      <button
                        onClick={() => {
                          const msg = `🌸 Hello ${order.customer_name}! Your Chrish Flora order (${order.id.slice(0, 8).toUpperCase()}) status: ${order.status}. Thank you! 🌸`;
                          window.open(`https://wa.me/${formatPhoneForWhatsApp(order.customer_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="text-emerald-500"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 font-sans">Fulfillment:</span>
                  <span className="ml-1 font-medium">{order.fulfillment_method === 'Delivery' ? '🚚 Del' : '🏪 Pick'}</span>
                </div>
              </div>

              {/* Bottom Row: Date & Amount */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <span className="text-[10px] text-gray-400 font-sans">
                  {orderDate.toLocaleDateString('en-LK')} {orderDate.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex items-baseline gap-0.5 font-sans">
                  <span className="text-[10px] text-gold-600/70">LKR</span>
                  <span className="price-small text-gold-600">
                    {order.total.toLocaleString('en-LK')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {paginatedOrders.length === 0 && (
          <p className="text-center py-10 text-gray-400 font-sans text-xs">No matching transactions found.</p>
        )}
      </div>

      {/* 7. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4 select-none">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gold hover:border-gold disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-xs font-sans text-gray-500 font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:text-gold hover:border-gold disabled:opacity-40 disabled:hover:text-gray-500 disabled:hover:border-gray-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 8. Detailed Transaction Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setSelected(null)} />
          
          {/* Modal Container */}
          <div className="relative bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[92vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-flora-brown text-flora-cream px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] text-white/50 font-sans uppercase font-bold tracking-widest">Order Details</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="font-serif text-xl">#{selected.id.slice(0, 16).toUpperCase()}...</h2>
                  {selected.cashier_id ? (
                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded uppercase">POS Sale</span>
                  ) : (
                    <span className="text-[9px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded uppercase">Online Order</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-flora-cream/75 hover:text-flora-cream p-1 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-touch bg-gray-50">
              {/* Section 1: Logistics / Info Card */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2 text-xs">
                  <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold-700">Order Metadata</h4>
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-gray-400">Order ID:</span>
                    <span className="font-mono text-gray-800 font-semibold">{selected.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-gray-400">Date & Time:</span>
                    <span className="text-gray-800 font-medium">{new Date(selected.created_at).toLocaleString('en-LK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transaction Source:</span>
                    <span className="text-gray-800 font-bold">{selected.cashier_id ? 'POS Register Console' : 'Storefront Checkout'}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold-700">Logistics & Cashier</h4>
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-gray-400">Fulfillment Mode:</span>
                    <span className="text-gray-800 font-semibold flex items-center gap-1">
                      {selected.fulfillment_method === 'Delivery' ? '🚚 Delivery' : '🏪 Store Pickup'}
                    </span>
                  </div>
                  {selected.requested_delivery_date && (
                    <div className="flex justify-between border-b border-gray-50 pb-1.5">
                      <span className="text-gray-400">Requested Date:</span>
                      <span className="text-gray-800 font-semibold">
                        {selected.requested_delivery_date}
                      </span>
                    </div>
                  )}
                  {selected.requested_delivery_time && (
                    <div className="flex justify-between border-b border-gray-50 pb-1.5">
                      <span className="text-gray-400">Requested Time:</span>
                      <span className="text-gray-800 font-semibold">
                        {selected.requested_delivery_time}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span className="text-gray-400">Payment Channel:</span>
                    <span className="text-gray-800 font-semibold">{selected.payment_method || 'Online'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Order Status:</span>
                    <OrderStatusBadge status={selected.status} />
                  </div>
                </div>
              </div>

              {/* Section 2: Customer details card */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3.5">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold-700">Customer details</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-olive-100 flex items-center justify-center font-serif text-lg font-bold text-gold-700 border">
                      {selected.customer_name[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="font-sans text-sm font-semibold text-gray-800">{selected.customer_name}</p>
                      <p className="text-gray-400 font-mono">{selected.customer_phone}</p>
                      {selected.customer_email && <p className="text-gray-400">{selected.customer_email}</p>}
                    </div>
                  </div>

                  {/* Customer WhatsApp trigger */}
                  {selected.customer_phone && selected.customer_phone !== 'N/A' && (
                    <button
                      onClick={() => {
                        const msg = generateReceiptMessage({
                          orderId: selected.id,
                          customerName: selected.customer_name,
                          items: (selected.order_items || []).map(item => ({
                            name: item.product?.name || 'Flower arrangement',
                            quantity: item.quantity,
                            unitPrice: item.unit_price,
                            order_item_addons: item.order_item_addons || [],
                          })),
                          subtotal: selected.subtotal,
                          deliveryCharge: selected.delivery_charge,
                          grandTotal: selected.total,
                          fulfillment: selected.fulfillment_method,
                          paymentMethod: selected.payment_method || 'Online',
                          cashierName: selected.cashier_id ? 'Cashier Staff' : 'Storefront Guest',
                          dateTime: new Date(selected.created_at).toLocaleString('en-LK', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }),
                        });
                        shareOnWhatsApp(selected.customer_phone, msg);
                      }}
                      className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA855] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Send Receipt via WhatsApp
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Order items checklist table */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold-700">Items Ordered</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[9px]">
                        <th className="py-2 px-1">Product</th>
                        <th className="py-2 px-1">SKU</th>
                        <th className="py-2 px-1 text-center">Qty</th>
                        <th className="py-2 px-1 text-right">Unit Price</th>
                        <th className="py-2 px-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {(selected.order_items || []).map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-2.5">
                              <div className="relative w-9 h-9 rounded bg-gray-50 border overflow-hidden shrink-0">
                                {item.product?.image_url ? (
                                  <Image src={item.product.image_url} alt={item.product?.name} fill className="object-cover" sizes="36px" />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-xs">🌸</div>
                                )}
                              </div>
                            <div className="flex flex-col">
                              <span className="font-sans font-medium text-gray-800 line-clamp-2 max-w-[160px] leading-tight">{item.product?.name || 'Flower arrangement'}</span>
                              {item.order_item_addons?.map((oa: any) => (
                                <div key={oa.id} className="flex items-center gap-1 mt-0.5 ml-2">
                                  <span className="text-[8px] text-gray-400">└</span>
                                  <span className="text-[10px] text-gray-500">{oa.addon_name}</span>
                                  <span className="text-[10px] text-gold-600 font-semibold tabular-nums">
                                    (+LKR {Number(oa.addon_price).toLocaleString('en-LK')})
                                  </span>
                                </div>
                              ))}
                            </div>
                            </div>
                          </td>
                          <td className="py-2 px-1 font-mono text-[10px] text-gold-600 font-semibold">{item.product?.sku}</td>
                          <td className="py-2 px-1 text-center font-mono font-semibold">{item.quantity}</td>
                          <td className="py-2 px-1 text-right">
                            <div className="flex items-baseline justify-end gap-0.5 font-sans">
                              <span className="text-[9px] text-gray-400">LKR</span>
                              <span className="price-small text-gray-700">
                                {item.unit_price.toLocaleString('en-LK')}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-1 text-right">
                            <div className="flex items-baseline justify-end gap-0.5 font-sans">
                              <span className="text-[9px] text-gold-600/70">LKR</span>
                              <span className="price-small text-gold-600">
                                {(item.quantity * item.unit_price).toLocaleString('en-LK')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Financial Summary */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-2.5">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-gold-700">Financial Summary</h4>
                <div className="space-y-1.5 text-xs text-gray-600 font-sans">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[9px] text-gray-400">LKR</span>
                      <span className="price-small text-gray-700">
                        {selected.subtotal.toLocaleString('en-LK')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge {selected.fulfillment_method === 'Delivery' && selected.delivery_distance_km ? `(${selected.delivery_distance_km.toFixed(2)} km)` : ''}</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[9px] text-gray-400">LKR</span>
                      <span className="price-small text-gray-700">
                        {selected.delivery_charge.toLocaleString('en-LK')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-flora-brown">
                    <span className="text-sm">GRAND TOTAL</span>
                    <span className="price-display text-lg text-gold-600 font-bold">
                      LKR {selected.total.toLocaleString('en-LK')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-sans">Payment Status:</span>
                    {getPaymentStatus(selected) === 'Paid' ? (
                      <span className="bg-green-50 border border-green-150 text-green-700 text-[10px] font-semibold font-sans px-2.5 py-0.5 rounded-full">✓ Payment Received</span>
                    ) : getPaymentStatus(selected) === 'Pending' ? (
                      <span className="bg-amber-50 border border-amber-150 text-amber-700 text-[10px] font-semibold font-sans px-2.5 py-0.5 rounded-full">⏳ Payment Pending</span>
                    ) : (
                      <span className="bg-red-50 border border-red-150 text-red-700 text-[10px] font-semibold font-sans px-2.5 py-0.5 rounded-full">✗ Payment Failed</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Order Notes (if available) */}
              {selected.order_note && (
                <div className="bg-olive-50 border border-olive-100/50 rounded-xl p-4 shadow-sm flex items-start gap-2.5 text-xs text-gray-700">
                  <FileText size={16} className="text-olive-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-olive-800 uppercase tracking-wide text-[9px]">Order Notes</p>
                    <p className="mt-1 italic">"{selected.order_note}"</p>
                  </div>
                </div>
              )}

              {/* Section 6: Delivery location Address Map preview (if delivery coordinates available) */}
              {selected.fulfillment_method === 'Delivery' && selected.delivery_lat && selected.delivery_lng && (
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-flora-brown">Delivery Address</h5>
                      <p className="text-gray-500 mt-0.5 leading-normal">{selected.delivery_address || 'Pin dropped on map'}</p>
                    </div>
                  </div>

                  {/* OSM Map Preview Iframe */}
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.delivery_lng - 0.005}%2C${selected.delivery_lat - 0.005}%2C${selected.delivery_lng + 0.005}%2C${selected.delivery_lat + 0.005}&layer=mapnik&marker=${selected.delivery_lat}%2C${selected.delivery_lng}`}
                      className="w-full h-full border-0 select-none pointer-events-none"
                      title="Fulfillment Location Map"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal sticky Footer Actions */}
            <div className="bg-white p-4 lg:p-6 border-t border-gray-100 flex flex-wrap gap-3 shrink-0 pb-safe">
              {/* Thermal Print */}
              <button
                type="button"
                onClick={() => printReceipt(selected)}
                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 h-12"
              >
                <Printer size={15} /> Print Receipt
              </button>

              {/* Share receipt directly */}
              <button
                type="button"
                onClick={() => {
                  const msg = generateReceiptMessage({
                    orderId: selected.id,
                    customerName: selected.customer_name,
                    items: (selected.order_items || []).map(item => ({
                      name: item.product?.name || 'Flower arrangement',
                      quantity: item.quantity,
                      unitPrice: item.unit_price,
                      order_item_addons: item.order_item_addons || [],
                    })),
                    subtotal: selected.subtotal,
                    deliveryCharge: selected.delivery_charge,
                    grandTotal: selected.total,
                    fulfillment: selected.fulfillment_method,
                    paymentMethod: selected.payment_method || 'Online',
                    cashierName: selected.cashier_id ? 'Cashier Staff' : 'Storefront Guest',
                    dateTime: new Date(selected.created_at).toLocaleString('en-LK', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }),
                  });
                  
                  if (!selected.customer_phone || selected.customer_phone.trim() === '' || selected.customer_phone === 'N/A') {
                    navigator.clipboard?.writeText(msg);
                    alert('No phone number available! Receipt text copied to clipboard instead.');
                    return;
                  }
                  shareOnWhatsApp(selected.customer_phone, msg);
                }}
                className="flex-1 bg-[#25D366] hover:bg-[#1DA855] text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 h-12"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg> Share WhatsApp
              </button>

              {/* Status Selector Drop */}
              <select
                value={selected.status}
                onChange={e => handleStatusChange(selected.id, e.target.value as OrderStatus)}
                className="flex-1 border border-gray-250 px-4 py-3 rounded-xl text-xs font-sans font-semibold bg-gold hover:bg-gold-dark text-white focus:outline-none focus:ring-1 focus:ring-gold h-12 cursor-pointer transition-colors"
              >
                {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-white text-gray-800">{s}</option>)}
              </select>

              <button 
                type="button"
                onClick={() => setSelected(null)}
                className="w-full sm:w-auto border border-gray-300 hover:bg-gray-50 text-gray-600 font-sans font-medium text-xs px-6 py-3 rounded-xl h-12"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
