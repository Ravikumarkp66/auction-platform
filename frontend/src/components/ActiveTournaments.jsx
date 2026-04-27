"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL, getMediaUrl } from "@/lib/apiConfig";
import { Trophy, ArrowRight, Calendar, MapPin, Zap, Loader2 } from "lucide-react";

export default function ActiveTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch(`${API_URL}/api/tournaments`);
        const data = await res.json();
        // Filter for active or upcoming tournaments
        const active = data.filter(t => t.status === 'active' || t.status === 'upcoming' || t.status === 'live');
        // Sort by newest first
        active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTournaments(active.slice(0, 3)); // Show top 3
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  if (loading) return (
    <div className="py-20 bg-slate-950 flex flex-col items-center justify-center gap-4">
       <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Loading Arena...</p>
    </div>
  );

  if (tournaments.length === 0) return null;

  const isUrgent = (endDate, endTime) => {
    if (!endDate) return false;
    const end = new Date(`${endDate.split('T')[0]}T${endTime || '23:59'}`);
    const now = new Date();
    const diff = end - now;
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  };

  return (
    <section id="tournament-arena" className="py-24 bg-[#020617] relative overflow-hidden border-y border-white/5">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05),transparent_70%)]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
             <Trophy className="w-3 h-3" />
             Live & Upcoming Events
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">
            TOURNAMENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-400">ARENA</span>
          </h2>
          <p className="mt-4 text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Join the most prestigious local cricket battles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tournaments.map((t) => {
            const urgent = isUrgent(t.registrationEndDate, t.registrationEndTime);
            return (
            <div key={t._id} className="group relative bg-slate-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-2xl hover:shadow-violet-600/10 flex flex-col">
              {/* Image Header */}
              <div className="h-56 relative overflow-hidden">
                <img 
                  src={getMediaUrl(t.assets?.splashUrl, "/tournaments/t1_v2.jpg")} 
                  alt={t.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent"></div>
                
                {/* Status Badge */}
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className={`px-3 py-1.5 ${t.status === 'active' ? 'bg-emerald-600' : 'bg-violet-600'} text-white text-[9px] font-[1000] uppercase tracking-widest rounded-lg shadow-lg`}>
                    {t.status}
                  </span>
                  {t.registrationEndDate && (
                    <span className={`px-3 py-1.5 ${urgent ? 'bg-red-600 animate-pulse' : 'bg-black/60'} backdrop-blur-md text-white text-[9px] font-[1000] uppercase tracking-widest rounded-lg border border-white/10`}>
                       {urgent ? 'Closing Soon' : 'Registration Open'}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight group-hover:text-violet-400 transition-colors leading-tight">{t.name}</h3>
                  <div className="flex items-center gap-3 mt-3 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                       <MapPin className="w-4 h-4 text-violet-500" />
                    </div>
                    {t.organizerName || "Local Arena"}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                         <span className={`text-[9px] font-black uppercase tracking-widest ${urgent ? 'text-red-500' : 'text-slate-500'}`}>Registration Ends</span>
                         <span className={`text-xs font-black uppercase tracking-wider mt-1 ${urgent ? 'text-red-400' : 'text-white'}`}>
                            {(() => {
                               if (!t.registrationEndDate) return 'TBD';
                               const endDay = new Date(t.registrationEndDate);
                               const today = new Date();
                               today.setHours(0,0,0,0);
                               endDay.setHours(0,0,0,0);
                               const diffDays = Math.round((endDay - today) / (1000 * 60 * 60 * 24));
                               if (diffDays === 0) return <span className="text-red-500 animate-pulse font-black">Today</span>;
                               if (diffDays === 1) return <span className="text-yellow-500 font-black">Tomorrow</span>;
                               return endDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                            })()}
                         </span>
                      </div>
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${urgent ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'}`}>
                         <Calendar className={`w-4 h-4 ${urgent ? 'text-red-500' : 'text-slate-500'}`} />
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                   <Link 
                     href={`/register/${t._id}`}
                     className="w-full py-4.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-2xl text-[10px] font-[1000] uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 hover:scale-[1.02] transition-all shadow-xl shadow-violet-600/20"
                   >
                      <Zap className="w-4 h-4" /> Apply Now
                   </Link>
                   <Link 
                     href="/auctions"
                     className="w-full py-4.5 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 hover:text-white transition-all"
                   >
                      Browse Auction <ArrowRight className="w-4 h-4" />
                   </Link>
                </div>
              </div>
            </div>
          );})}
        </div>
      </div>
    </section>
  );
}
