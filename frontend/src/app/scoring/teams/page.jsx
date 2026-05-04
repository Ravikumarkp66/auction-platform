"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MyTeams() {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/teams`);
      if (res.ok) {
        setTeams(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      
      {/* ── Header ── */}
      <div className="bg-[#008060] text-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center p-4">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-black/10 transition">
            <ArrowLeft size={24} />
          </button>
          <h1 className="flex-1 font-bold text-lg ml-4">My Teams</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto w-full space-y-4">
        
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>No teams found.</p>
          </div>
        ) : (
          teams.map(team => (
            <div key={team._id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner shrink-0">
                  {(team.logoUrl || team.logo) ? (
                      <img src={team.logoUrl || team.logo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                      <span className="text-lg font-bold text-slate-500">{team.name?.slice(0,2)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 tracking-wide text-base">{team.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{team.location || "Local Team"} • {team.shortName}</p>
                </div>
              </div>
              <button className="text-[#008060] text-sm font-bold uppercase hover:bg-emerald-50 px-3 py-1.5 rounded transition">
                View
              </button>
            </div>
          ))
        )}
        
      </div>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Link href="/scoring/start" className="w-14 h-14 bg-[#008060] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
          <Plus size={28} />
        </Link>
      </div>

    </div>
  );
}
