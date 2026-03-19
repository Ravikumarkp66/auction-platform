"use client";

import { useLanguage } from '../context/LanguageContext';

export default function ServicesCard({ title, description, price, icon }) {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700 hover:border-violet-500/50 transition-all duration-300 group">
      <div className="p-8">
        <div className="w-14 h-14 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <span className="text-3xl">{icon}</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 mb-6 leading-relaxed">
          {description}
        </p>
        <div className="mt-4 pt-6 border-t border-slate-700">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">{t.common.startingFrom}</p>
          <p className="text-3xl font-extrabold text-violet-400 mt-1">{price}</p>
        </div>
      </div>
    </div>
  );
}
