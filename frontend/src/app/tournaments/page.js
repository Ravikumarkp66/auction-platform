"use client";

import TournamentCard from '../../components/TournamentCard';
import { tournaments } from '../../data/tournaments';
import { useLanguage } from '../../context/LanguageContext';

export default function TournamentsPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-900 min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight mb-4">
            {t.tournaments.title1} <span className="text-emerald-500">{t.tournaments.title2}</span>
          </h1>
          <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto">
            {t.tournaments.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mt-12">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} {...tournament} />
          ))}
          
          <TournamentCard 
            name="Winter Cricket Cup" 
            location="University Grounds" 
            year="2022" 
            image="https://images.unsplash.com/photo-1593341646782-e0b495cff86d?q=80&w=500&auto=format&fit=crop" 
          />
          <TournamentCard 
            name="Corporate T10 Challenge" 
            location="IT Park Stadium" 
            year="2023" 
            image="https://images.unsplash.com/photo-1624526267942-ab068a4192b0?q=80&w=500&auto=format&fit=crop" 
          />
          <TournamentCard 
            name="Youth Champions Trophy" 
            location="City Central Ground" 
            year="2021" 
            image="https://images.unsplash.com/photo-1587280501635-a19d71c4ac44?q=80&w=500&auto=format&fit=crop" 
          />
        </div>
      </div>
    </div>
  );
}
