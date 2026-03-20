"use client";

import { useState, useEffect } from "react";
import { Users, Search, Save, X, AlertTriangle, ShieldCheck, Trophy, AlertCircle, Edit3, ArrowUpRight } from "lucide-react";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";

// Socket instance for real-time broadcast
let socket;

export default function TeamsRegistry() {
  const { selectedAuction } = useAuction();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({});
  const [confirmText, setConfirmText] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, name }

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchTeams();
      socket = io(process.env.NEXT_PUBLIC_API_URL);
    } else {
      setLoading(false);
    }
    return () => socket?.disconnect();
  }, [selectedAuction]);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`);
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Fetch teams error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openManageModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      shortName: team.shortName,
      remainingBudget: team.remainingBudget || 0,
      color: team.color || "#7c3aed"
    });
    setIsManageModalOpen(true);
  };

  const handleSaveClick = () => {
    setIsManageModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    if (confirmText !== "CONFIRM") return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${editingTeam._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // Broadcast via socket
        socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
        setIsConfirmModalOpen(false);
        setConfirmText("");
        fetchTeams();
      }
    } catch (err) {
      alert("Error updating team");
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedAuction) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
        <AlertCircle className="w-12 h-12 text-yellow-400 mb-4 opacity-50" />
        <h3 className="text-xl font-black text-white">No Auction Selected</h3>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm font-semibold italic">Select a context from the top monitor to manage nodes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* ── Table Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Node <span className="text-violet-500 text-2xl">Configuration</span></h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Database: {selectedAuction.name}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400" />
            <input 
              type="text" 
              placeholder="Query team node..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#111827]/60 backdrop-blur-xl border border-white/10 rounded-2xl pl-11 pr-4 py-3 font-bold text-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-[#111827]/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Team Node</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Short Code</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Node Population</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Purse Balance</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTeams.map((t) => (
                <tr key={t._id} className="group hover:bg-white/[0.03] transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => setEditImageTarget({ id: t._id, url: t.logoUrl, name: t.name })}
                        className="relative w-10 h-10 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg bg-slate-800 flex items-center justify-center font-black text-white cursor-pointer hover:border-violet-500/50 transition-all group/img" 
                        style={{ background: t.color + "33", color: t.color }}>
                        {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : t.name?.[0]}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                           <Edit3 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-tight">{t.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">ID: {t._id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] bg-[#7c3aed]/10 px-2 py-1 rounded-lg border border-[#7c3aed]/20">{t.shortName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Users className="w-3 h-3 text-slate-600" />
                       <span className="text-sm font-black text-white">{t.players?.length || 0}</span>
                       <span className="text-[10px] text-slate-700 font-bold">/ {selectedAuction.squadSize || 15}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-emerald-400">₹{(t.remainingBudget / 1000).toFixed(1)}k</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2" />
                     <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-60 italic leading-none">Healthy</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button 
                      onClick={() => openManageModal(t)}
                      className="px-4 py-2 bg-[#7c3aed] hover:bg-[#8b5cf6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-[#7c3aed]/20"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeams.length === 0 && (
            <div className="py-20 text-center opacity-30 italic font-black uppercase tracking-[0.5em]">Zero Data Matched</div>
          )}
        </div>
      </div>

      {/* ── MANAGE MODAL ── */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <h2 className="text-xl font-black text-white">Node <span className="text-violet-500">Refinement</span></h2>
               <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team Name</label>
                  <input 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Short Code</label>
                  <input 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500 uppercase"
                    value={formData.shortName}
                    onChange={e => setFormData({...formData, shortName: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Liquidity (₹)</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-black text-sm">₹</div>
                   <input 
                    type="number"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-emerald-400 outline-none focus:border-violet-500"
                    value={formData.remainingBudget}
                    onChange={e => setFormData({...formData, remainingBudget: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
               <button onClick={() => setIsManageModalOpen(false)} className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all text-center">Abort</button>
               <button 
                 onClick={handleSaveClick}
                 className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all"
               >
                 Stage Updates
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION DIALOG ── */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in zoom-in-95">
          <div className="bg-[#0f172a] border border-red-500/20 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="p-8 text-center space-y-4">
               <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-white">Manual Override?</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    You are manually adjusting the financial ledger for <span className="text-white font-black">{editingTeam?.name}</span>. This will affect bidding capability.
                  </p>
               </div>
               
               <div className="pt-4 space-y-3">
                  <div className="space-y-1.5 text-left">
                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Type &quot;CONFIRM&quot; to authorize</label>
                     <input 
                       className="w-full bg-slate-900 border border-red-500/20 rounded-xl px-4 py-3 text-center text-sm font-black text-red-400 outline-none focus:border-red-500 transition-all placeholder:text-slate-800"
                       placeholder="CONFIRM"
                       value={confirmText}
                       onChange={e => setConfirmText(e.target.value.toUpperCase())}
                     />
                  </div>
                  
                  <div className="flex gap-2">
                     <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-600 hover:text-white transition-all">Cancel</button>
                     <button 
                       disabled={confirmText !== 'CONFIRM'}
                       onClick={handleFinalConfirm}
                       className="flex-1 py-3 bg-red-600 disabled:opacity-20 disabled:grayscale text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-500 transition-all"
                     >
                       <ShieldCheck className="w-3 h-3 inline mr-1" /> Commit
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE EDIT MODAL ── */}
      {editImageTarget && (
        <ImageEditModal
          title={`Edit Logo: ${editImageTarget.name}`}
          initialImage={editImageTarget.url}
          onClose={() => setEditImageTarget(null)}
          onSave={async (file) => {
             try {
                const fileType = file.type;
                const { uploadUrl, fileUrl } = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=teams`).then(r => r.json());
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logoUrl: fileUrl })
                });

                if (res.ok) {
                   socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                   fetchTeams();
                }
             } catch (err) {
                console.error("Logo update failed", err);
                alert("Logo update failed");
             }
          }}
        />
      )}
    </div>
  );
}
