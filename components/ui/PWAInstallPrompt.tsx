'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — hide prompt
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(ios);

    // Android / Desktop: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);

      const lastDismissed = localStorage.getItem('pwa-dismissed');
      const dismissedTime = lastDismissed ? parseInt(lastDismissed) : 0;
      const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

      if (!lastDismissed || daysSince > 3) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual instructions after a delay
    if (ios) {
      const lastDismissedIOS = localStorage.getItem('pwa-dismissed-ios');
      if (!lastDismissedIOS) {
        setTimeout(() => setShowPrompt(true), 8000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(
      isIOS ? 'pwa-dismissed-ios' : 'pwa-dismissed',
      Date.now().toString()
    );
  };

  if (isInstalled || !showPrompt) return null;

  /* ─── iOS — manual Share sheet instructions ─────────────────── */
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-128x128.png" alt="Chrish Flora" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-serif text-lg text-flora-brown font-medium">
              Install Chrish Flora
            </p>
            <p className="text-xs font-sans text-flora-brown/60 mt-0.5 mb-3">
              Add to your home screen for the best experience
            </p>

            <div className="space-y-2">
              {[
                { num: '1', icon: '⬆️', text: 'Tap the Share button' },
                { num: '2', icon: '📲', text: 'Scroll down and tap' },
                { num: '3', icon: '➕', text: '"Add to Home Screen"' },
              ].map(step => (
                <div key={step.num} className="flex items-center gap-2 text-xs font-sans text-flora-brown/70">
                  <span className="w-5 h-5 bg-gold-100 text-gold-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {step.num}
                  </span>
                  <span>{step.icon} {step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Android / Desktop — native install prompt ──────────────── */
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gold-100 overflow-hidden animate-slide-up md:left-auto md:right-6 md:max-w-sm">
      {/* Gold accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-gold-400 via-gold-600 to-olive-400" />

      <div className="p-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-128x128.png" alt="Chrish Flora" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-serif text-xl text-flora-brown font-medium">Chrish Flora</p>
            <p className="text-xs font-sans text-flora-brown/50">chrishflora.com</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="text-gold-500 text-xs">★</span>
              ))}
              <span className="text-[10px] font-sans text-flora-brown/40 ml-1">Luxury Florist</span>
            </div>
          </div>
        </div>

        <p className="text-sm font-sans text-flora-brown/70 mb-4 leading-relaxed">
          Install our app for faster ordering, offline browsing and instant order updates!
        </p>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: '⚡', label: 'Fast' },
            { icon: '📴', label: 'Offline' },
            { icon: '🔔', label: 'Updates' },
          ].map(f => (
            <div key={f.label} className="text-center p-2 bg-olive-50 rounded-xl">
              <p className="text-lg">{f.icon}</p>
              <p className="text-[10px] font-sans text-flora-brown/60 mt-0.5">{f.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-sans text-sm text-flora-brown/60 hover:bg-gray-50 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-[2] py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl font-sans text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-95"
          >
            <Download size={16} />
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
