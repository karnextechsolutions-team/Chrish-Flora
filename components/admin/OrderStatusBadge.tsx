// components/admin/OrderStatusBadge.tsx
import type { OrderStatus } from '@/types';

const statusStyles: Record<OrderStatus, string> = {
  Pending:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  Confirmed:        'bg-blue-100 text-blue-800 border-blue-200',
  Processing:       'bg-purple-100 text-purple-800 border-purple-200',
  'Out for Delivery':'bg-orange-100 text-orange-800 border-orange-200',
  Delivered:        'bg-green-100 text-green-800 border-green-200',
  Cancelled:        'bg-red-100 text-red-800 border-red-200',
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge-status border ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
