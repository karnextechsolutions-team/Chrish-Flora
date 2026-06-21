import Link from 'next/link';
import { CheckCircle, Clock, Package } from 'lucide-react';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paid?: string; cancelled?: string }>;
}) {
  const resolvedParams = await searchParams;
  const isPaid = resolvedParams.paid === 'true';
  const isCancelled = resolvedParams.cancelled === 'true';
  const orderId = resolvedParams.orderId;

  return (
    <div className="bg-pattern-organic min-h-screen flex items-center justify-center py-20 px-6 relative overflow-hidden">
      {/* Falling Confetti Pieces (Only show for successful or pending COD checkouts, not cancelled) */}
      {!isCancelled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          <div className="confetti-piece bg-gold-400" style={{ left: '12%', animationDelay: '0.1s', animationDuration: '3.5s' }} />
          <div className="confetti-piece bg-olive-400" style={{ left: '28%', animationDelay: '0.4s', animationDuration: '4.2s' }} />
          <div className="confetti-piece bg-gold-500" style={{ left: '42%', animationDelay: '0.2s', animationDuration: '3.8s' }} />
          <div className="confetti-piece bg-olive-300" style={{ left: '58%', animationDelay: '0.7s', animationDuration: '4.8s' }} />
          <div className="confetti-piece bg-gold-300" style={{ left: '72%', animationDelay: '0.3s', animationDuration: '4.0s' }} />
          <div className="confetti-piece bg-olive-500" style={{ left: '88%', animationDelay: '0.5s', animationDuration: '4.5s' }} />
          <div className="confetti-piece bg-gold-600" style={{ left: '18%', animationDelay: '0.6s', animationDuration: '3.9s' }} />
          <div className="confetti-piece bg-olive-400" style={{ left: '94%', animationDelay: '0.2s', animationDuration: '4.6s' }} />
        </div>
      )}

      {/* Center Card */}
      <div className="max-w-xl w-full bg-white border border-gold-200 shadow-xl rounded-2xl p-8 md:p-12 text-center relative z-10">
        {isCancelled ? (
          <>
            <div className="text-6xl mb-6 select-none">❌</div>
            <h1 className="font-serif text-4xl text-flora-brown mb-4">Payment Cancelled</h1>
            <p className="text-flora-brown/60 font-sans mb-8 leading-relaxed">
              Your payment was cancelled. Your order has been saved.
              You can complete payment from your order history.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/storefront/checkout" className="btn-gold inline-block w-full sm:w-auto">
                Try Again
              </Link>
              <Link href="/storefront" className="inline-block w-full sm:w-auto text-center border border-gray-200 text-flora-brown py-3 px-6 rounded-xl hover:bg-gray-50 font-semibold transition-all">
                Continue Shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6 select-none">🌸</div>

            <h1 className="font-serif text-4xl md:text-5xl text-flora-brown mb-4">
              Thank You!
            </h1>

            {isPaid ? (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200
                text-green-700 text-sm font-sans px-5 py-2 rounded-full mb-6">
                <CheckCircle size={16} />
                Payment Successful
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200
                text-amber-700 text-sm font-sans px-5 py-2 rounded-full mb-6">
                <Clock size={16} />
                Cash on Delivery
              </div>
            )}

            <p className="text-flora-brown/60 font-sans mb-4 leading-relaxed max-w-md mx-auto">
              Your order has been placed successfully. We are preparing your beautiful
              arrangement with love and care.
            </p>

            {orderId && (
              <div className="inline-flex items-center gap-2 text-sm font-sans text-gold-700
                bg-gold-50 border border-gold-200 px-5 py-2.5 rounded-full mb-8">
                <Package size={15} />
                Order ID: <span className="font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
              </div>
            )}

            <p className="text-flora-brown/40 font-sans text-sm mb-10 max-w-sm mx-auto">
              {isPaid
                ? 'Your payment has been confirmed. We will contact you shortly.'
                : 'Please have the exact amount ready upon delivery.'}
            </p>

            <Link href="/storefront/products"
              className="inline-block bg-gold-600 hover:bg-gold-700 text-white
                px-10 py-4 rounded-xl font-sans text-sm tracking-widest uppercase
                font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm w-full sm:w-auto">
              Continue Shopping
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
