
"use client";


import Hero from '../components/Hero';
import ServicesCard from '../components/ServicesCard';
import TournamentCard from '../components/TournamentCard';
import { tournaments } from '../data/tournaments';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { t } = useLanguage();

  return (
    <>
      <Hero />
      
      {/* About Brief Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-emerald-500 font-semibold tracking-wide uppercase">{t.home.aboutTitle}</h2>
            <p className="mt-2 text-2xl sm:text-3xl md:text-4xl leading-8 font-extrabold tracking-tight text-white">
              {t.home.aboutHeading}
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-400 mx-auto">
              {t.home.aboutDesc}
            </p>
            <div className="mt-8">
              <Link href="/about" className="text-emerald-400 hover:text-emerald-300 font-medium pb-1 border-b-2 border-emerald-500 transition-colors">
                {t.home.readMore}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">{t.home.servicesTitle}</h2>
            <p className="mt-4 text-xl text-gray-400">{t.home.servicesDesc}</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12 max-w-5xl mx-auto">
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
        </div>
      </section>

      {/* Tournaments Preview Section */}
      <section className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{t.home.tournamentsTitle}</h2>
              <p className="mt-2 text-gray-400">{t.home.tournamentsDesc}</p>
            </div>
            <Link href="/tournaments" className="hidden sm:block text-emerald-400 hover:text-emerald-300 font-medium">
              {t.home.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.slice(0, 3).map((tournament) => (
              <TournamentCard key={tournament.id} {...tournament} />
            ))}
          </div>
          <div className="mt-10 sm:hidden text-center">
            <Link href="/tournaments" className="text-emerald-400 hover:text-emerald-300 font-medium">
              {t.home.viewAllBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white text-shadow">
            <span className="block">{t.home.ctaTitle1}</span>
            <span className="block text-emerald-900 mt-2">{t.home.ctaTitle2}</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/booking" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-bold rounded-md text-emerald-600 bg-white hover:bg-gray-50 transition-colors">
                {t.home.ctaBook}
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link href="/contact" className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-bold rounded-md text-white bg-emerald-800 hover:bg-emerald-900 transition-colors">
                {t.home.ctaContact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
