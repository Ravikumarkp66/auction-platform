"use client";

import { useLanguage } from '../../context/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight mb-4">
            {t.contact.title1} <span className="text-emerald-500">{t.contact.title2}</span>
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700 max-w-5xl mx-auto">
          
          <div className="p-8 sm:p-12 bg-gradient-to-br from-slate-800 to-slate-900">
            <h3 className="text-2xl font-bold text-white mb-8">{t.contact.infoTitle}</h3>
            
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500/10 text-emerald-500 text-2xl">
                    📞
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{t.contact.phone}</p>
                  <a href="tel:+919876543210" className="text-lg font-bold text-white hover:text-emerald-400 transition-colors">
                    +91 98765 43210
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500/10 text-emerald-500 text-2xl">
                    💬
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{t.contact.whatsapp}</p>
                  <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:text-emerald-400 transition-colors">
                    {t.contact.msgNow}
                  </a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500/10 text-emerald-500 text-2xl">
                    ✉️
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{t.contact.email}</p>
                  <a href="mailto:booking@auctionpro.com" className="text-lg font-bold text-white hover:text-emerald-400 transition-colors border-b border-transparent hover:border-emerald-400">
                    booking@auctionpro.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-slate-700">
              <h4 className="text-lg font-bold text-white mb-6">{t.contact.socialTitle}</h4>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors flex flex-col items-center">
                  <span className="text-3xl mb-1">📸</span>
                  <span className="text-xs font-semibold">Instagram</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors flex flex-col items-center">
                  <span className="text-3xl mb-1">📘</span>
                  <span className="text-xs font-semibold">Facebook</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors flex flex-col items-center">
                  <span className="text-3xl mb-1">▶️</span>
                  <span className="text-xs font-semibold">YouTube</span>
                </a>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 border-l border-slate-700 bg-slate-800">
            <h3 className="text-2xl font-bold text-white mb-2">{t.contact.msgTitle}</h3>
            <p className="text-gray-400 mb-8 text-sm">{t.contact.msgDesc}</p>
            
            <form action="#" className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">{t.contact.formName}</label>
                <input type="text" name="name" id="name" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">{t.contact.formEmail}</label>
                <input type="email" name="email" id="email" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300">{t.contact.formMessage}</label>
                <textarea id="message" name="message" rows="4" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"></textarea>
              </div>
              
              <button type="submit" className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 transition-colors">
                {t.contact.formSubmit}
              </button>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
