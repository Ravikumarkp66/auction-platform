"use client";

import { useLanguage } from '../../context/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center flex-col-reverse">
          <div>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight mb-6">
              {t.about.title1} <span className="text-emerald-500">{t.about.title2}</span>
            </h1>
            <h2 className="text-2xl font-bold text-gray-300 mb-6">
              {t.about.subtitle}
            </h2>
            <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
              <p>{t.about.p1}</p>
              <p>{t.about.p2}</p>
              <p>{t.about.p3}</p>
            </div>
            
            <div className="mt-10 pt-10 border-t border-slate-800 flex justify-start space-x-12">
              <div>
                <p className="text-4xl font-extrabold text-emerald-500">50+</p>
                <p className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-widest">{t.about.statsAuctions}</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold text-emerald-500">200+</p>
                <p className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-widest">{t.about.statsMatches}</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 rounded-2xl transform translate-x-4 translate-y-4 opacity-20"></div>
            <img 
              src="https://images.unsplash.com/photo-1517466787929-c77441865324?q=80&w=800&auto=format&fit=crop" 
              alt="Commentator in action" 
              className="relative rounded-2xl shadow-2xl object-cover h-[600px] w-full border border-slate-700" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
