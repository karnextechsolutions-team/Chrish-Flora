'use client';
import { useState, Fragment } from 'react';
import { Search, UserPlus, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import OrderStatusBadge from './OrderStatusBadge';

interface Customer {
  id: string;
  role: 'customer' | 'admin' | 'staff';
  full_name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface Order {
  id: string;
  user_id: string | null;
  total: number;
  status: string;
  created_at: string;
  fulfillment_method: string;
}

interface Props {
  initialCustomers: Customer[];
  initialOrders: Order[];
}

export default function CustomersClient({ initialCustomers, initialOrders }: Props) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const supabase = createClient();

  // Search filter
  const filteredCustomers = customers.filter(c => {
    const name = (c.full_name || '').toLowerCase();
    const email = c.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const getCustomerStats = (customerId: string) => {
    const customerOrders = initialOrders.filter(o => o.user_id === customerId);
    const completedOrders = customerOrders.filter(o => o.status !== 'Cancelled');
    const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const lastFive = customerOrders.slice(0, 5); // orders are pre-sorted by created_at DESC

    return {
      orderCount: customerOrders.length,
      totalSpent,
      lastFive
    };
  };

  const handlePromoteToStaff = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to promote ${customer.full_name || 'this customer'} to Staff? This will grant them access to POS and Order Management.`)) {
      return;
    }

    setLoadingId(customer.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'staff' })
        .eq('id', customer.id);

      if (error) throw error;

      // Remove from customer list since role is no longer 'customer'
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      alert(`${customer.full_name || 'Customer'} successfully promoted to Staff.`);
    } catch (err: any) {
      alert(`Promotion failed: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleBlock = async (customer: Customer) => {
    const newActiveState = !customer.is_active;
    const actionText = newActiveState ? 'unblock' : 'block';
    
    if (!confirm(`Are you sure you want to ${actionText} ${customer.full_name || 'this customer'}?`)) {
      return;
    }

    setLoadingId(customer.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newActiveState })
        .eq('id', customer.id);

      if (error) throw error;

      setCustomers(prev =>
        prev.map(c => c.id === customer.id ? { ...c, is_active: newActiveState } : c)
      );
    } catch (err: any) {
      alert(`Failed to update customer status: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpandRow = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h2 className="font-serif text-3xl text-flora-brown">Customer Directory</h2>
        <p className="text-sm font-sans text-gray-500 mt-1">
          Review customer join dates, order history statistics, and manage account statuses.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gold-500 text-sm text-gray-800"
          />
        </div>
      </div>

      {/* Customer List Table & Cards */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
        {/* Desktop Table view */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-6 w-10"></th>
                <th className="py-3 px-6">Customer Name</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6">Phone</th>
                <th className="py-3 px-6">Join Date</th>
                <th className="py-3 px-6 text-center">Orders</th>
                <th className="py-3 px-6 text-right">Total Spent</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-serif">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const stats = getCustomerStats(customer.id);
                  const initial = customer.full_name ? customer.full_name.charAt(0).toUpperCase() : '?';

                  return (
                    <Fragment key={customer.id}>
                      <tr 
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer
                          ${isExpanded ? 'bg-gray-50/40' : ''}`}
                        onClick={() => toggleExpandRow(customer.id)}
                      >
                        {/* Chevron Expand Indicator */}
                        <td className="py-4 px-6 text-gray-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>

                        {/* Name & Avatar */}
                        <td className="py-4 px-6 font-medium text-flora-brown font-serif">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-flora-cream-dark border border-gray-200 text-flora-brown flex items-center justify-center text-xs font-bold">
                              {initial}
                            </div>
                            <span className="font-semibold text-sm">
                              {customer.full_name || 'No Name'}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-6 font-mono text-xs">
                          {customer.email}
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-6 text-xs font-mono">
                          {customer.phone || '—'}
                        </td>

                        {/* Join Date */}
                        <td className="py-4 px-6 text-xs text-gray-500">
                          {new Date(customer.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>

                        {/* Orders count */}
                        <td className="py-4 px-6 text-center font-mono text-xs font-bold">
                          {stats.orderCount}
                        </td>

                        {/* Total Spent */}
                        <td className="py-4 px-6 text-right font-mono font-semibold text-flora-brown">
                          LKR {stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Actions */}
                        <td 
                          className="py-4 px-6 text-right space-x-1.5"
                          onClick={e => e.stopPropagation()} // block click-row expand when action clicked
                        >
                          {/* Promote to Staff */}
                          <button
                            onClick={() => handlePromoteToStaff(customer)}
                            disabled={loadingId === customer.id}
                            title="Promote to Staff"
                            className="p-1.5 rounded border border-olive-200 text-olive-600 hover:bg-olive-50 disabled:opacity-50 transition-colors"
                          >
                            <UserPlus size={15} />
                          </button>

                          {/* Block/Unblock */}
                          <button
                            onClick={() => handleToggleBlock(customer)}
                            disabled={loadingId === customer.id}
                            title={customer.is_active ? 'Block Customer' : 'Unblock Customer'}
                            className={`p-1.5 rounded border transition-colors disabled:opacity-50
                              ${customer.is_active
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                          >
                            {customer.is_active ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Order History Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/50 p-6 border-t border-b border-gray-100">
                            <div className="space-y-3 pl-8">
                              <div className="flex items-center gap-2 text-flora-brown font-serif text-sm font-semibold">
                                <ShoppingBag size={16} />
                                <h4>Last 5 Orders</h4>
                              </div>
                              
                              {stats.lastFive.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No orders placed yet.</p>
                              ) : (
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-w-4xl shadow-sm">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-4">Order ID</th>
                                        <th className="py-2.5 px-4">Date</th>
                                        <th className="py-2.5 px-4">Fulfillment</th>
                                        <th className="py-2.5 px-4">Status</th>
                                        <th className="py-2.5 px-4 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                      {stats.lastFive.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/40">
                                          <td className="py-2.5 px-4 font-mono font-bold text-flora-brown">
                                            #{order.id.substring(0, 8).toUpperCase()}
                                          </td>
                                          <td className="py-2.5 px-4 text-gray-500">
                                            {new Date(order.created_at).toLocaleString()}
                                          </td>
                                          <td className="py-2.5 px-4 text-gray-600 font-medium">
                                            {order.fulfillment_method}
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <OrderStatusBadge status={order.status as any} />
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-mono font-semibold">
                                            LKR {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List view */}
        <div className="lg:hidden divide-y divide-gray-100">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-serif text-sm">
              No customers found.
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const isExpanded = expandedCustomerId === customer.id;
              const stats = getCustomerStats(customer.id);
              const initial = customer.full_name ? customer.full_name.charAt(0).toUpperCase() : '?';

              return (
                <div key={customer.id} className={`p-4 transition-colors ${isExpanded ? 'bg-gray-50/40' : ''}`}>
                  {/* Card Header clickable to toggle expand */}
                  <div 
                    className="flex items-start justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpandRow(customer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-flora-cream-dark border border-gray-200 text-flora-brown flex items-center justify-center text-sm font-bold shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-serif font-semibold text-flora-brown text-sm">
                          {customer.full_name || 'No Name'}
                        </p>
                        <p className="text-xs text-gray-500 font-mono truncate">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-gray-400 p-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Customer Stats Row */}
                  <div className="grid grid-cols-2 gap-4 mt-3 text-xs bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div>
                      <p className="text-gray-400">Total Spent</p>
                      <p className="font-mono font-bold text-flora-brown mt-0.5">
                        LKR {stats.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Orders Processed</p>
                      <p className="font-mono font-bold text-gray-800 mt-0.5">
                        {stats.orderCount}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-4">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Phone:</span>
                        <span className="font-mono font-semibold text-gray-700">{customer.phone || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Join Date:</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Last 5 Orders Accordion */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-flora-brown font-serif text-xs font-semibold">
                          <ShoppingBag size={14} />
                          <span>Last 5 Orders</span>
                        </div>
                        {stats.lastFive.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic">No orders placed yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {stats.lastFive.map(order => (
                              <div key={order.id} className="bg-white border border-gray-100 p-2.5 rounded text-xs space-y-1.5 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-bold text-flora-brown">
                                    #{order.id.substring(0, 8).toUpperCase()}
                                  </span>
                                  <OrderStatusBadge status={order.status as any} />
                                </div>
                                <div className="flex justify-between text-gray-500 text-[10px]">
                                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                  <span>{order.fulfillment_method}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-50 pt-1 mt-1 text-[11px]">
                                  <span className="text-gray-400">Total:</span>
                                  <span className="font-mono font-bold text-gray-800">
                                    LKR {Number(order.total).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handlePromoteToStaff(customer)}
                          disabled={loadingId === customer.id}
                          className="flex items-center gap-1.5 px-3 py-2 border border-olive-200 text-olive-600 hover:bg-olive-50 disabled:opacity-50 transition-colors text-xs font-semibold rounded h-10"
                        >
                          <UserPlus size={15} />
                          Promote to Staff
                        </button>
                        <button
                          onClick={() => handleToggleBlock(customer)}
                          disabled={loadingId === customer.id}
                          className={`flex items-center gap-1.5 px-3 py-2 border transition-colors disabled:opacity-50 text-xs font-semibold rounded h-10
                            ${customer.is_active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {customer.is_active ? (
                            <>
                              <ShieldAlert size={15} />
                              Block Account
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={15} />
                              Unblock Account
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
