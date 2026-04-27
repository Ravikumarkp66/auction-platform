"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import HeroCarousel from './HeroCarousel';
import { API_URL, getMediaUrl } from '../lib/apiConfig';

export default function Hero() {
  const { t } = useLanguage();
  const [customLogo, setCustomLogo] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.brandLogo) {
          setCustomLogo(getMediaUrl(data.data.brandLogo));
        }
      })
      .catch(err => console.error("Hero brand fetch error:", err));
  }, []);

  return (
    <div className="relative bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32 pt-20 px-4 sm:px-6 lg:px-8 min-h-[90vh] flex flex-col justify-center">
          
          <main className="mt-10 mx-auto max-w-7xl w-full sm:mt-12 md:mt-16 lg:mt-20">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              
              {/* LEFT SIDE - Text Content */}
              <div className="sm:text-center lg:text-left lg:w-1/2">
                {/* Bold Vibrant Strike Logo Badge */}
                <div className="flex items-center gap-4 mb-10 group cursor-pointer transition-all duration-500 hover:scale-[1.03] justify-center lg:justify-start">
                  <div className="relative flex items-center justify-center p-1">
                    <div className="absolute inset-0 bg-violet-600/15 blur-[12px] rounded-full scale-125" />
                    <svg className="w-16 h-16 relative" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M40 80L75 45" stroke="#A855F7" strokeWidth="12" strokeLinecap="round" />
                      <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="#A855F7" />
                      <path d="M45 45L80 80" stroke="white" strokeWidth="12" strokeLinecap="round" />
                      <circle cx="60" cy="60" r="10" fill="#FBBF24" className="animate-pulse shadow-gold" />
                    </svg>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-5">
                    <span className="text-4xl font-[1000] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-violet-400 leading-none uppercase">
                      LAKSHMISH
                    </span>
                    <span className="text-sm font-black tracking-[0.4em] uppercase text-violet-500 mt-2 pl-0.5">
                      Cricket Events
                    </span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl tracking-tight font-extrabold text-white">
                  <span className="block">{t.hero.title1}</span>{' '}
                  <span className="block text-violet-500 xl:inline">{t.hero.title2}</span>
                </h1>
                <p className="mt-5 text-base text-gray-400 sm:text-lg sm:max-w-xl sm:mx-auto md:text-xl lg:mx-0">
                  {t.hero.subtitle}
                </p>
                <div className="mt-8 sm:mt-10 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link href="/booking" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-bold rounded-md text-slate-900 bg-violet-500 hover:bg-violet-400 md:py-4 md:text-lg transition-colors shadow-lg shadow-violet-500/40">
                      {t.hero.bookBtn}
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link href="/services" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-violet-400 bg-slate-800 hover:bg-slate-700 md:py-4 md:text-lg transition-colors">
                      {t.hero.viewBtn}
                    </Link>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE - Carousel */}
              <div className="w-full lg:w-1/2 relative z-20">
                <HeroCarousel />
              </div>
              
            </div>
          </main>
          
        </div>
      </div>
      
      {/* Background Graphic (Subtle) */}
      <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-l from-violet-900/10 to-transparent"></div>
      </div>
    </div>
  );
}
