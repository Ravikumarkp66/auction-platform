"use client";

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import HeroCarousel from './HeroCarousel';

export default function Hero() {
  const { t } = useLanguage();

  return (
    <div className="relative bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32 pt-20 px-4 sm:px-6 lg:px-8 min-h-[90vh] flex flex-col justify-center">
          
          <main className="mt-10 mx-auto max-w-7xl w-full sm:mt-12 md:mt-16 lg:mt-20">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              
              {/* LEFT SIDE - Text Content */}
              <div className="sm:text-center lg:text-left lg:w-1/2">
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
