"use client";

import { useLanguage } from '../../context/LanguageContext';

export default function BookingPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-white sm:text-5xl tracking-tight mb-4">
            {t.booking.title1} <span className="text-violet-500">{t.booking.title2}</span>
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            {t.booking.subtitle}
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
          <div className="px-6 py-8 sm:p-10">
            <form action="#" method="POST" className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                
                <div className="sm:col-span-2">
                  <label htmlFor="tournament-name" className="block text-sm font-medium text-gray-300">
                    {t.booking.formName}
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="tournament-name"
                      id="tournament-name"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      placeholder={t.booking.formNamePlaceholder}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-300">
                    {t.booking.formLocation}
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="location"
                      id="location"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-300">
                    {t.booking.formDate}
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="date"
                      id="date"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="teams" className="block text-sm font-medium text-gray-300">
                    {t.booking.formTeams}
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="teams"
                      id="teams"
                      min="2"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      placeholder="8"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                    {t.booking.formPhone}
                  </label>
                  <div className="mt-1">
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      autoComplete="tel"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      placeholder="+91 "
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t.booking.formServices}</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="form-checkbox text-violet-500 bg-slate-900 border-slate-700 rounded focus:ring-violet-500 w-5 h-5" />
                      <span className="ml-2 text-gray-300">{t.booking.formAuction}</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="checkbox" className="form-checkbox text-violet-500 bg-slate-900 border-slate-700 rounded focus:ring-violet-500 w-5 h-5" />
                      <span className="ml-2 text-gray-300">{t.booking.formComm}</span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300">
                    {t.booking.formMessage}
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      className="py-3 px-4 block w-full bg-slate-900 border border-slate-700 rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                      placeholder={t.booking.formMessagePlaceholder}
                    ></textarea>
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent rounded-md shadow-sm text-base font-bold text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-violet-500 transition-colors"
                  >
                    {t.booking.formSubmit}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
