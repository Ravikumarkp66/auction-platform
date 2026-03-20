"use client";

import { useState, useEffect } from "react";
import { Star, Trophy, Users, ShieldCheck, User, Search, Hash, AlertCircle, Edit3 } from "lucide-react";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";

let socket;

export default function IconPlayersPanel() {
  const { selectedAuction } = useAuction();
  const [icons, setIcons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, name }

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchIcons();
      socket = io(process.env.NEXT_PUBLIC_API_URL);
    } else {
      setLoading(false);
    }
    return () => socket?.disconnect();
  }, [selectedAuction]);

  const fetchIcons = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players?tournamentId=${selectedAuction._id}&isIcon=true`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();
      
      // Filter for icons only
      const iconPlayers = pData.filter(p => p.isIcon);
      setIcons(iconPlayers);
      setTeams(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t._id === (teamId?._id || teamId));
    return team ? team.name : "Unassigned";
  };

  const filteredIcons = icons
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.iconId || 0) - (b.iconId || 0));

  if (!selectedAuction) {
     return (
       <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/5 rounded-[3rem] text-center">
         <AlertCircle className="w-12 h-12 text-yellow-500/50 mb-4" />
         <h2 className="text-xl font-black text-white">No Auction Registry Context</h2>
         <p className="text-slate-500 text-sm mt-2 max-w-xs font-semibold">Select an auction system from the topbar to view icon rosters.</p>
       </div>
     );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      
      {/* ── HEADER AREA ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-[2rem] text-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
              <Star className="w-8 h-8 fill-yellow-500" />
           </div>
           <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Icon <span className="text-yellow-500">Node</span> Registry</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">System Privilege Level 1: Elite Personnel</p>
           </div>
        </div>

        <div className="relative group min-w-[320px]">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
           <input 
             placeholder="Search icon roster..." 
             className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 font-bold text-white focus:border-yellow-500 outline-none transition-all placeholder:text-slate-700"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* ── ELITE ROSTER GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIcons.map((p) => (
          <div key={p._id} className="relative group overflow-hidden bg-[#111827]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 hover:border-yellow-500/30 transition-all duration-500 shadow-2xl">
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[60px] rounded-full pointer-events-none" />

            {/* Profile Header */}
            <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                     <div 
                        onClick={() => setEditImageTarget({ id: p._id, url: p.imageUrl, name: p.name })}
                        className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-yellow-500/20 shadow-xl group-hover:scale-110 transition-transform duration-700 cursor-pointer relative group/img"
                     >
                        {p.imageUrl ? (
                           <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-3xl text-slate-600">
                              {p.name?.[0]}
                           </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                           <Edit3 className="w-6 h-6 text-yellow-500" />
                        </div>
                     </div>
                     <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-lg shadow-yellow-500/20 z-10">
                        ⭐ ICON
                     </div>
                  </div>
                  
                  <div className="text-right">
                     <div className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 uppercase tracking-widest inline-flex items-center gap-1">
                        ICON ID: {p.iconId}
                     </div>
                  </div>
               </div>

               <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white group-hover:text-yellow-500 transition-colors uppercase leading-none">{p.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{p.role}</p>
               </div>
            </div>

            {/* Allocation Matrix */}
            <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deployment Node</p>
                  <div className="flex items-center gap-2">
                     <Trophy className="w-3.5 h-3.5 text-yellow-500/60" />
                     <p className="text-sm font-black text-white truncate">{getTeamName(p.team)}</p>
                  </div>
               </div>
               <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access Key</p>
                  <div className="flex items-center justify-end gap-2">
                     <p className="text-sm font-black text-white">{p.teamSlotId || "PRE-PROCESSED"}</p>
                     <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
               </div>
            </div>
          </div>
        ))}

        {filteredIcons.length === 0 && (
           <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-30 italic font-black uppercase tracking-[0.5em] text-slate-500">
              No Elite Units Authorized
           </div>
        )}
      </div>

      {/* ── IMAGE EDIT MODAL ── */}
      {editImageTarget && (
        <ImageEditModal
          title={`Edit Icon: ${editImageTarget.name}`}
          initialImage={editImageTarget.url}
          onClose={() => setEditImageTarget(null)}
          onSave={async (file) => {
             try {
                const fileType = file.type;
                const { uploadUrl, fileUrl } = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`).then(r => r.json());
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageUrl: fileUrl })
                });

                if (res.ok) {
                   socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                   fetchIcons();
                }
             } catch (err) {
                console.error("Photo update failed", err);
                alert("Photo update failed");
             }
          }}
        />
      )}
    </div>
  );
}
