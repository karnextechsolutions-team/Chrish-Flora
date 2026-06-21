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

declare global {
  interface Window {
    payhere: {
      pay: (payment: object) => void;
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
    };
  }
}

// Load PayHere script once globally
let scriptPromise: Promise<void> | null = null;

function loadPayHereSDK(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window !== 'undefined' && window.payhere) {
      resolve();
      return;
    }

    // Check if script tag already exists
    const existing = document.querySelector('script[src*="payhere"]');
    if (existing) {
      // Script exists, wait for payhere object
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.payhere) {
          clearInterval(check);
          resolve();
        } else if (attempts > 100) {
          clearInterval(check);
          scriptPromise = null;
          reject(new Error('PayHere SDK timeout'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.payhere.lk/lib/payhere.bundle.js';
    script.async = false; // Load synchronously for reliability

    script.onload = () => {
      // Poll until window.payhere is available
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.payhere) {
          clearInterval(check);
          resolve();
        } else if (attempts > 100) {
          clearInterval(check);
          scriptPromise = null;
          reject(new Error('PayHere object not found after load'));
        }
      }, 100);
    };

    script.onerror = (e) => {
      scriptPromise = null;
      console.error('PayHere script load error:', e);
      reject(new Error('Failed to load PayHere script. Check your internet connection.'));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function PayHereButton({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const isSandbox = process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === 'true';

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Load SDK
      await loadPayHereSDK();

      // 2. Get hash from backend
      const hashRes = await fetch('/api/payhere/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, currency: 'LKR' }),
      });

      if (!hashRes.ok) {
        const err = await hashRes.json().catch(() => ({}));
        throw new Error(err.error || `Hash request failed (${hashRes.status})`);
      }

      const { hash, merchantId, amountFormatted } = await hashRes.json();

      if (!hash || !merchantId) {
        throw new Error('Invalid hash response from server');
      }

      // 3. Prepare customer name
      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'N/A';

      // 4. Site URL for callbacks
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      // 5. Payment object
      const payment = {
        sandbox: isSandbox,
        merchant_id: merchantId,
        return_url: `${siteUrl}/storefront/order-confirmation?orderId=${orderId}&paid=true`,
        cancel_url: `${siteUrl}/storefront/checkout?cancelled=true`,
        notify_url: `${siteUrl}/api/payhere/notify`,
        order_id: orderId,
        items: 'Chrish Flora - Floral Arrangement',
        amount: amountFormatted,
        currency: 'LKR',
        hash,
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
      };

      // 6. Register callbacks BEFORE calling pay()
      window.payhere.onCompleted = (id: string) => {
        console.log('PayHere completed:', id);
        setLoading(false);
        onSuccess();
      };

      window.payhere.onDismissed = () => {
        console.log('PayHere dismissed');
        setLoading(false);
      };

      window.payhere.onError = (error: string) => {
        console.error('PayHere error:', error);
        setLoading(false);
        onError(error || 'Payment error. Please try again.');
      };

      // 7. Open PayHere popup
      setLoading(false);
      window.payhere.pay(payment);

    } catch (err: any) {
      console.error('PayHere setup error:', err);
      setLoading(false);
      // Reset promise so next click retries
      scriptPromise = null;
      onError(err.message || 'Payment initialization failed. Please try again.');
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className={className || `w-full flex items-center justify-center gap-3
        bg-gold-600 hover:bg-gold-700
        text-white font-sans font-bold
        text-sm tracking-widest uppercase
        py-4 px-8 rounded-xl
        shadow-lg hover:shadow-xl
        hover:-translate-y-0.5 active:translate-y-0
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Connecting to PayHere...
        </>
      ) : (
        <>
          <CreditCard size={18} />
          Pay with PayHere — LKR {amount.toLocaleString()}
        </>
      )}
    </button>
  );
}