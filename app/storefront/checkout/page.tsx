// app/storefront/checkout/page.tsx
import CheckoutClient from '@/components/storefront/CheckoutClient';
import { createClient } from '@/lib/supabase/server';

export default async function CheckoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  const { data: settings } = await supabase
    .from('store_settings')
    .select('*')
    .limit(1)
    .single();

  return (
    <div className="bg-pattern-organic min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 bg-gradient-to-r from-gold-100/60 via-gold-50/20 to-transparent p-6 border-l-4 border-gold-500 rounded-r-xl">
          <p className="text-gold-700 font-sans text-xs tracking-[0.4em] uppercase mb-2">
            Almost There
          </p>
          <h1 className="font-serif text-5xl text-flora-brown">Checkout</h1>
        </div>
        <CheckoutClient
          user={user}
          profile={profile}
          settings={settings}
        />
      </div>
    </div>
  );
}
