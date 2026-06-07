// app/storefront/layout.tsx
import StorefrontNav from '@/components/storefront/StorefrontNav';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-flora-brown text-flora-cream/70 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-serif text-2xl text-flora-cream tracking-wide">Chrish Flora</p>
            <p className="text-sm mt-1">Luxury Floral Boutique</p>
          </div>
          <p className="text-xs tracking-widest uppercase">
            © {new Date().getFullYear()} Chrish Flora. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
