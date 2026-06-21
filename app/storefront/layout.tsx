'use client';

// app/storefront/layout.tsx
import { useState } from 'react';
import Link from 'next/link';
import StorefrontNav from '@/components/storefront/StorefrontNav';
import MobileBottomNav from '@/components/storefront/MobileBottomNav';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-pattern-dots">
      <StorefrontNav cartOpen={cartOpen} setCartOpen={setCartOpen} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileBottomNav cartOpen={cartOpen} setCartOpen={setCartOpen} />
      
      {/* PREMIUM BOTANICAL FOOTER */}
      <footer className="bg-charcoal text-cream pt-16 pb-28 md:pb-16 px-6 mt-auto">
        <div className="max-w-7xl mx-auto">
          
          {/* Top tagline */}
          <div className="flex flex-col items-center pb-8 border-b border-primary-gold/15 mb-12">
            <Link href="/storefront" className="font-serif italic text-4xl text-cream hover:text-primary-gold transition-colors tracking-wide">
              Chrish Flora
            </Link>
            <span className="font-sans text-[10px] tracking-[0.25em] text-primary-gold uppercase font-semibold mt-2 text-center">
              Curated Sri Lankan Floristry & Luxury Botanicals
            </span>
          </div>

          {/* Middle: 4 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-sm text-cream/60 mb-16">
            
            {/* Col 1: About */}
            <div className="flex flex-col items-start">
              <h4 className="text-primary-gold text-[11px] font-sans tracking-[0.2em] uppercase font-bold mb-5">About Chrish Flora</h4>
              <p className="leading-relaxed mb-6 text-xs max-w-xs text-cream/70">
                Luxury florist boutique in Sri Lanka specializing in premium seasonal arrangements, bespoke wedding floral designs, and sensory boutique styling.
              </p>
              <div className="flex items-center gap-4 text-xs font-sans tracking-[0.1em] uppercase font-semibold">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-primary-gold transition-colors">Instagram</a>
                <span className="text-primary-gold/40">·</span>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-primary-gold transition-colors">Facebook</a>
              </div>
            </div>

            {/* Col 2: Shop */}
            <div>
              <h4 className="text-primary-gold text-[11px] font-sans tracking-[0.2em] uppercase font-bold mb-5">Shop</h4>
              <ul className="flex flex-col gap-3 text-xs">
                <li><Link href="/storefront/products" className="hover:text-primary-gold transition-colors">All Collections</Link></li>
                <li><Link href="/storefront/products" className="hover:text-primary-gold transition-colors">New Arrivals</Link></li>
                <li><Link href="/storefront/products" className="hover:text-primary-gold transition-colors">Bestsellers</Link></li>
                <li><Link href="/storefront/products" className="hover:text-primary-gold transition-colors">Signature Curations</Link></li>
              </ul>
            </div>

            {/* Col 3: Help */}
            <div>
              <h4 className="text-primary-gold text-[11px] font-sans tracking-[0.2em] uppercase font-bold mb-5">Help</h4>
              <ul className="flex flex-col gap-3 text-xs">
                <li><Link href="/storefront" className="hover:text-primary-gold transition-colors">Track Order</Link></li>
                <li><Link href="/storefront" className="hover:text-primary-gold transition-colors">FAQ</Link></li>
                <li><Link href="/storefront#contact" className="hover:text-primary-gold transition-colors">Contact Support</Link></li>
                <li><Link href="/storefront" className="hover:text-primary-gold transition-colors">Delivery Policies</Link></li>
              </ul>
            </div>

            {/* Col 4: Visit Us */}
            <div>
              <h4 className="text-primary-gold text-[11px] font-sans tracking-[0.2em] uppercase font-bold mb-5">Visit Us</h4>
              <ul className="flex flex-col gap-3 text-xs leading-relaxed text-cream/70">
                <li>100 Galle Rd, Colombo 00300</li>
                <li>T: +94 11 234 5678</li>
                <li>E: boutique@chrishflora.com</li>
                <li>Hours: Daily 9:00 AM - 8:00 PM</li>
              </ul>
            </div>

          </div>

          {/* Bottom copyright */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mb-6" />
          <div className="text-center text-cream/35 text-[10px] font-sans tracking-widest uppercase">
            <p>© {new Date().getFullYear()} Chrish Flora · Crafted with love in Colombo, Sri Lanka</p>
          </div>

        </div>
      </footer>
    </div>
  );
}

