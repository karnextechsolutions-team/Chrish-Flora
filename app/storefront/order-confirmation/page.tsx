// app/storefront/order-confirmation/page.tsx
import Link from 'next/link';

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="text-6xl mb-6">🌸</div>
      <h1 className="font-serif text-5xl text-flora-brown mb-4">
        Thank You!
      </h1>
      <p className="text-flora-brown/60 font-sans mb-4 leading-relaxed">
        Your order has been placed successfully. We are preparing your beautiful
        arrangement with care.
      </p>
      {orderId && (
        <p className="text-sm font-sans text-gold-700 bg-gold-50 border border-gold-200 px-4 py-2 inline-block mb-8">
          Order ID: <span className="font-medium">{orderId}</span>
        </p>
      )}
      <p className="text-flora-brown/50 font-sans text-sm mb-10">
        You will receive updates on your order status. If you have any questions,
        please contact us.
      </p>
      <Link href="/storefront/products" className="btn-gold">
        Continue Shopping
      </Link>
    </div>
  );
}
