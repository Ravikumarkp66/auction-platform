"use client";

import { useLanguage } from '../../context/LanguageContext';

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight mb-4">
            {t.contact.title1} <span className="text-violet-500">{t.contact.title2}</span>
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
                  <span className="flex items-center justify-center h-12 w-12 rounded-md bg-violet-500/10 text-violet-500 text-2xl">
                    📞
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{t.contact.phone}</p>
                  <a href="tel:+918147089330" className="text-lg font-bold text-white hover:text-violet-400 transition-colors">
                    +91 81470 89330
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-slate-700">
              <h4 className="text-lg font-bold text-white mb-6">{t.contact.socialTitle}</h4>
              <div className="flex space-x-6">
                <a href="https://www.instagram.com/lakshmish_virat/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-violet-400 transition-colors flex flex-col items-center">
                  <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                  <span className="text-sm font-semibold">@lakshmish_virat</span>
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
                <input type="text" name="name" id="name" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500" />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">{t.contact.formEmail}</label>
                <input type="email" name="email" id="email" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500" />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300">{t.contact.formMessage}</label>
                <textarea id="message" name="message" rows="4" className="mt-1 py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"></textarea>
              </div>
              
              <button type="submit" className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-bold text-slate-900 bg-violet-500 hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-colors">
                {t.contact.formSubmit}
              </button>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
