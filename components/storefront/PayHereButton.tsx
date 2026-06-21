'use client';

import { useState } from 'react';
import { Loader2, CreditCard } from 'lucide-react';

interface Props {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  className?: string;
}

export default function PayHereButton({
  orderId, amount, customerName, customerEmail,
  customerPhone, onSuccess, onError, className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const isSandbox = process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === 'true';

  const handlePayment = async () => {
    setLoading(true);
    try {
      const hashRes = await fetch('/api/payhere/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, currency: 'LKR' }),
      });

      if (!hashRes.ok) throw new Error(`Server error (${hashRes.status})`);

      const { hash, merchantId, amountFormatted } = await hashRes.json();
      if (!hash || !merchantId) throw new Error('Invalid payment server response');

      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'N/A';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const payhereUrl = isSandbox
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payhereUrl;

      const fields: Record<string, string> = {
        merchant_id: merchantId,
        return_url: `${siteUrl}/storefront/order-confirmation?orderId=${orderId}&paid=true`,
        cancel_url: `${siteUrl}/storefront/checkout?cancelled=true&orderId=${orderId}`,
        notify_url: `${siteUrl}/api/payhere/notify`,
        order_id: orderId,
        items: 'Chrish Flora - Floral Arrangement',
        currency: 'LKR',
        amount: amountFormatted,
        first_name: firstName,
        last_name: lastName,
        email: customerEmail || 'customer@chrishflora.com',
        phone: customerPhone.replace(/\D/g, '').replace(/^0/, '94').slice(-10),
        address: 'Colombo',
        city: 'Colombo',
        country: 'Sri Lanka',
        delivery_address: 'Colombo',
        delivery_city: 'Colombo',
        delivery_country: 'Sri Lanka',
        hash: hash,
      };

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      console.error('PayHere error:', err);
      setLoading(false);
      onError(err.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={className || `w-full flex items-center justify-center gap-3
        bg-gold-600 hover:bg-gold-700 text-white font-sans font-bold
        text-sm tracking-widest uppercase py-4 px-8 rounded-xl
        shadow-lg transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <><Loader2 size={18} className="animate-spin" />Redirecting to PayHere...</>
      ) : (
        <><CreditCard size={18} />Pay with PayHere — LKR {amount.toLocaleString()}</>
      )}
    </button>
  );
}