"use client";

import ServicesCard from '../../components/ServicesCard';
import { useLanguage } from '../../context/LanguageContext';

export default function ServicesPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl tracking-tight mb-4">
            {t.services.title1} <span className="text-emerald-500">{t.services.title2}</span>
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto">
            {t.services.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 max-w-5xl mx-auto mt-20">
          <ServicesCard 
            title={t.services.auctionTitle} 
            description={t.services.auctionDesc}
            price={`₹5,000 ${t.common.perDay}`}
            icon="⚖️"
          />
          <ServicesCard 
            title={t.services.commTitle} 
            description={t.services.commDesc}
            price={`₹2,000 ${t.common.perMatch}`}
            icon="🎙️"
          />
        </div>
        
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-white mb-6">{t.services.customTitle}</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            {t.services.customDesc}
          </p>
          <a href="/contact" className="inline-block bg-slate-800 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 px-8 py-3 rounded-lg font-bold border border-emerald-500/30 transition-all">
            {t.services.customBtn}
          </a>
        </div>
      </div>
    </div>
  );
}
