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
        <div className="mt-4 pt-6 border-t border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black leading-none mb-1">{t.common.startingFrom}</p>
            <p className="text-2xl font-black text-white">{price}</p>
          </div>
          <button className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-violet-500/20 active:scale-95">
             Connect Now
          </button>
        </div>
      </div>
      {/* Decorative Gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
