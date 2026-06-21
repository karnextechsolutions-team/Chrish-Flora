'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Banner } from '@/types';

interface HeroBannerSliderProps {
  banners: Banner[];
}

const DEFAULT_BANNER: Banner = {
  id: 'default',
  title: 'Chrish Flora',
  subtitle: 'Luxury Floral E-Commerce',
  description: 'Experience premium handcrafted bouquets and custom floral arrangements designed for every special occasion.',
  button_text: 'Shop Now',
  button_link: '/storefront/products',
  image_url: null,
  bg_color: 'linear-gradient(135deg, #2D5A3D 0%, #1C3829 100%)',
  text_color: '#FEFCF5',
  badge_text: '🌸 Welcome to Chrish Flora',
  is_active: true,
  sort_order: 0
};

export default function HeroBannerSlider({ banners }: HeroBannerSliderProps) {
  const activeBanners = banners && banners.length > 0 ? banners : [DEFAULT_BANNER];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slide effect
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    if (!isPaused) {
      autoSlideRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length);
      }, 4000);
    }

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [isPaused, activeBanners.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section className="relative px-4 pt-4 select-none w-full">
      <div className="mx-auto max-w-7xl">
        <div
          className="relative h-[320px] md:h-[480px] xl:h-[560px] w-full rounded-3xl overflow-hidden shadow-card transition-all duration-300"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {activeBanners.map((banner, index) => {
            const isActive = index === currentIndex;
            const hasImage = !!banner.image_url;

            // Determine text colors if no image is present
            const isLightBg = banner.bg_color === '#FEFCF5' || banner.bg_color.toLowerCase().includes('cream') || banner.bg_color.toLowerCase().includes('#fefcf5');
            const defaultBadgeTextColor = banner.text_color || '#3D2E00';
            
            return (
              <div
                key={banner.id}
                style={{
                  background: !hasImage ? banner.bg_color : undefined,
                }}
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background image layer */}
                {hasImage && banner.image_url && (
                  <>
                    <Image
                      src={banner.image_url}
                      alt={banner.title}
                      fill
                      priority={index === 0}
                      className="object-cover object-center"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
                    />
                    <div
                      className="absolute inset-0 z-10"
                      style={{
                        background: 'linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.15) 100%)',
                      }}
                    />
                  </>
                )}

                {/* Right side decoration circle (if no image exists) */}
                {!hasImage && (
                  <div
                    className="absolute right-[-100px] top-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full border-2 pointer-events-none opacity-30"
                    style={{ borderColor: banner.text_color ? `${banner.text_color}20` : 'rgba(255,255,255,0.1)' }}
                  />
                )}

                {/* Content Area */}
                <div className="absolute left-6 md:left-12 lg:left-16 top-1/2 -translate-y-1/2 max-w-[85%] sm:max-w-[70%] md:max-w-[55%] z-20 text-left select-text">
                  {/* Badge */}
                  {banner.badge_text && (
                    <div
                      className="inline-flex items-center px-3 py-1.5 rounded-full border mb-3 md:mb-4 backdrop-blur-sm transition-all"
                      style={{
                        backgroundColor: hasImage ? 'rgba(255, 255, 255, 0.15)' : `${banner.text_color}15`,
                        borderColor: hasImage ? 'rgba(255, 255, 255, 0.25)' : `${banner.text_color}25`,
                      }}
                    >
                      <span
                        className="font-sans text-[9px] md:text-[10px] tracking-[0.2em] uppercase font-bold"
                        style={{ color: hasImage ? '#FFFFFF' : defaultBadgeTextColor }}
                      >
                        {banner.badge_text}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h2
                    className="font-serif text-2xl sm:text-3xl md:text-5xl xl:text-6xl font-semibold leading-[1.1] mb-2 sm:mb-3"
                    style={{ color: hasImage ? '#FFFFFF' : banner.text_color }}
                  >
                    {banner.title}
                  </h2>

                  {/* Subtitle */}
                  {banner.subtitle && (
                    <p
                      className="font-sans text-xs sm:text-sm md:text-base lg:text-lg font-medium leading-normal mb-2 sm:mb-3"
                      style={{ color: hasImage ? 'rgba(255, 255, 255, 0.85)' : `${banner.text_color}d0` }}
                    >
                      {banner.subtitle}
                    </p>
                  )}

                  {/* Description (Hidden on small mobile, show md+) */}
                  {banner.description && (
                    <p
                      className="hidden md:block font-sans text-xs md:text-sm leading-relaxed max-w-sm lg:max-w-md mb-6"
                      style={{ color: hasImage ? 'rgba(255, 255, 255, 0.65)' : `${banner.text_color}a0` }}
                    >
                      {banner.description}
                    </p>
                  )}

                  {/* CTA Button */}
                  <div className="mt-4 md:mt-6">
                    <Link
                      href={banner.button_link || '/storefront/products'}
                      className="group/btn inline-flex items-center gap-2 bg-white text-[#3D2E00] hover:bg-gold hover:text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-xl font-sans text-xs md:text-sm font-semibold tracking-wider shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_22px_rgba(0,0,0,0.22)] active:scale-95 transition-all duration-200"
                    >
                      <span>{banner.button_text || 'Shop Now'}</span>
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-200 group-hover/btn:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Navigation Arrows (Desktop only, 1024px+) */}
          {activeBanners.length > 1 && (
            <div className="hidden lg:block">
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200"
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Pagination Indicators */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
              {activeBanners.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`h-1.5 transition-all duration-300 rounded-full ${
                      isActive ? 'w-6 bg-gold' : 'w-1.5 bg-white/40 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
