// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';

export const viewport: Viewport = {
  themeColor: '#C8CC7A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Chrish Flora — Luxury Floral Boutique',
  description:
    "Sri Lanka's premier luxury floral boutique. Fresh handcrafted arrangements delivered to your door in Colombo.",
  keywords: ['flowers', 'bouquet', 'floral', 'Colombo', 'Sri Lanka', 'delivery'],
  authors: [{ name: 'Chrish Flora' }],
  creator: 'Chrish Flora',
  publisher: 'Chrish Flora',

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chrish Flora',
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    type: 'website',
    siteName: 'Chrish Flora',
    title: 'Chrish Flora — Luxury Floral Boutique',
    description:
      'Fresh handcrafted floral arrangements delivered in Colombo, Sri Lanka.',
    images: [{ url: '/icons/icon-512x512.png' }],
  },

  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/icon-512x512.png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://www.payhere.lk/lib/payhere.bundle.js"
          async
        />
      </head>
      <body style={{ backgroundColor: '#FBF7EE', color: '#5C4A00' }}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
