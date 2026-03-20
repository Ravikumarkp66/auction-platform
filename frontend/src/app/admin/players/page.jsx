"use client";

import { useState, useEffect } from "react";
import { User, Search, Plus, Filter, AlertTriangle, ShieldCheck, Check, X, AlertCircle, Hash, Trophy, MousePointer2, Edit3, FileSpreadsheet, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";

let socket;

export default function PlayersRegistry() {
  const { selectedAuction } = useAuction();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, SOLD, UNSOLD, AVAILABLE

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Form States
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({});
  const [newPlayer, setNewPlayer] = useState({ name: "", role: "Batsman", basePrice: 100, isIcon: false, status: "available", teamId: "" });
  const [isImporting, setIsImporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, type }

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchData();
      socket = io(process.env.NEXT_PUBLIC_API_URL);
    } else {
      setLoading(false);
    }
    return () => socket?.disconnect();
  }, [selectedAuction]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === "ALL" ? "ALL" : activeTab.toLowerCase();
      const [pRes, tRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players?tournamentId=${selectedAuction._id}&status=${statusParam}&isIcon=false`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();
      setPlayers(pData);
      setTeams(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleAddPlayer = async () => {
    try {
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ ...newPlayer, tournamentId: selectedAuction._id })
       });
       if (res.ok) {
         setIsAddModalOpen(false);
         setNewPlayer({ name: "", role: "Batsman", basePrice: 100, isIcon: false, status: "available", teamId: "" });
         fetchData();
       }
    } catch (err) { alert("Error adding player"); }
  };

  const openManageModal = (p) => {
    setEditingPlayer(p);
    setFormData({
      name: p.name,
      role: p.role,
      status: p.status,
      basePrice: p.basePrice || 0,
      soldPrice: p.soldPrice || 0,
      team: p.team?._id || p.team || "",
      isIcon: p.isIcon || false
    });
    setIsManageModalOpen(true);
  };

  const handleImportPlayers = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const bstr = ev.target.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            const findValue = (row, keys) => {
              const rk = Object.keys(row);
              for (const k of keys) {
                const f = rk.find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
                if (f) return row[f];
              }
              return null;
            };

            const players = data.map(row => ({
                name: findValue(row, ["player name", "playerName", "name", "player", "ಆಟಗಾರನ ಹೆಸರು"]) || "PLAYER NAME",
                role: findValue(row, ["playing role", "role", "skill", "player role", "category", "type", "position", "ಪಾತ್ರ", "ಸ್ಥಾನ"]) || "All-Rounder",
                mobile: findValue(row, ["mobile", "phone", "contact", "ಮೊಬೈಲ್", "ದೂರವಾಣಿ"]) || "-",
                battingStyle: findValue(row, ["batting", "battingStyle", "style", "ಬ್ಯಾಟಿಂಗ್"]) || "Right Hand",
                bowlingStyle: findValue(row, ["bowling", "bowlingStyle", "ಬೌಲಿಂಗ್"]) || "-",
                village: findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
                basePrice: Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || 100,
                imageUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url", "ಭಾವಚಿತ್ರ"]) || ""
            }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players, tournamentId: selectedAuction._id })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Successfully added ${result.added} new athletes! (Skipped ${result.skipped} duplicates)`);
                fetchData();
            } else {
                alert("Failed to import athletes");
            }
        } catch (err) {
            console.error("Import error:", err);
            alert("Error parsing file");
        } finally {
            setIsImporting(false);
            e.target.value = null;
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm("Keep only athletes 1 to 94 and remove everything else? This will restore your original list.")) return;
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/reset-to-baseline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tournamentId: selectedAuction._id })
        });
        if (res.ok) {
            const data = await res.json();
            alert(`Reset complete! Removed ${data.removed} athletes. Original 1-94 are retained.`);
            fetchData();
        }
    } catch (err) {
        alert("Reset failed");
    }
  };

  const handleFinalConfirm = async () => {
    if (confirmText !== "CONFIRM") return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editingPlayer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
        setIsConfirmModalOpen(false);
        setConfirmText("");
        fetchData();
      }
    } catch (err) { alert("Update failed"); }
  };

  const handleDeletePlayer = async (id) => {
    if (!confirm("Are you sure you want to delete this athlete? The list will be re-indexed automatically.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Athlete deleted and list re-indexed!");
        fetchData();
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const filtered = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!selectedAuction) return <div className="p-20 text-center text-slate-500">Select context...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Athlete <span className="text-violet-500">Registry</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[.3em] mt-1">Auction System v2.0</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                placeholder="Search database..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 font-bold text-white focus:border-violet-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>

           <button 
             onClick={handleCleanupDuplicates}
             className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 shadow-xl"
             title="Clean Up Duplicates"
           >
             <RefreshCw className="w-4 h-4" />
           </button>
            <label className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-violet-500/50 transition-all flex items-center gap-2 cursor-pointer shadow-xl shadow-black/20">
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {isImporting ? "Processing..." : "Import Sheet"}
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportPlayers} disabled={isImporting} />
            </label>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all flex items-center gap-2"
           >
             <Plus className="w-4 h-4" /> Add Athlete
           </button>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
        {["ALL", "AVAILABLE", "SOLD", "UNSOLD"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-[#111827]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Sl No (ID)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Athlete</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Price</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Node</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Slot</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.sort((a, b) => (a.applicationId || 0) - (b.applicationId || 0)).map((p) => (
                <tr key={p._id} className="group hover:bg-white/[0.03] transition-all">
                  <td className="px-8 py-4">
                     <span className="text-sm font-black text-violet-400 bg-violet-500/10 px-3 py-1 rounded-xl border border-violet-500/10">
                        {p.applicationId || "—"}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div 
                         onClick={() => setEditImageTarget({ id: p._id, url: p.imageUrl, name: p.name })}
                         className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-slate-800 flex items-center justify-center font-black text-white cursor-pointer hover:border-violet-500/50 transition-all group/img"
                       >
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-600" />}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Edit3 className="w-3 h-3 text-white" />
                          </div>
                       </div>
                       <div>
                          <p className="text-sm font-black text-white leading-tight">{p.name}</p>
                          {p.isIcon && <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter flex items-center gap-0.5"><Trophy className="w-2 h-2" /> ICON</span>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">{p.role}</td>
                  <td className="px-6 py-4">
                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        p.status === 'sold' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                        p.status === 'unsold' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
                     }`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-sm">{p.status === 'sold' ? `₹${p.soldPrice?.toLocaleString()}` : <span className="text-slate-700 italic">₹{p.basePrice}</span>}</td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-black uppercase text-slate-400 truncate max-w-[100px] block">
                        {p.team?.name || "—"}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     {p.teamSlotId ? (
                        <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                           {p.teamSlotId}
                        </span>
                     ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openManageModal(p)} className="p-2 bg-white/5 hover:bg-violet-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Manage"><MousePointer2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePlayer(p._id)} className="p-2 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Delete"><X className="w-4 h-4" /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest">Archive Empty</div>}
        </div>
      </div>

      {/* ── ADD PLAYER MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                 <h2 className="text-xl font-black text-white">New <span className="text-violet-500">Athlete</span></h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</label>
                 <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} /></div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value})}>
                       {["Batsman", "Bowler", "All-Rounder", "Wicket Keeper", "WK-Batsman"].map(r => <option key={r}>{r}</option>)}
                    </select></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Base Price (₹)</label>
                    <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.basePrice} onChange={e => setNewPlayer({...newPlayer, basePrice: e.target.value})} /></div>
                 </div>

                 <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 accent-violet-500" checked={newPlayer.isIcon} onChange={e => setNewPlayer({...newPlayer, isIcon: e.target.checked})} id="icon-check" />
                    <label htmlFor="icon-check" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer">Mark as Icon Player</label>
                 </div>

                 {newPlayer.isIcon && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Team</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.teamId} onChange={e => setNewPlayer({...newPlayer, teamId: e.target.value})}>
                       <option value="">Select Team</option>
                       {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select></div>
                 )}

                 <button onClick={handleAddPlayer} className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all mt-4">Initialize Data</button>
              </div>
           </div>
        </div>
      )}

      {/* ── MANAGE/EDIT MODAL ── */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                 <h2 className="text-xl font-black text-white">System <span className="text-violet-500">Override</span></h2>
                 <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</label>
                    <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                       {["Batsman", "Bowler", "All-Rounder", "Wicket Keeper", "WK-Batsman"].map(r => <option key={r}>{r}</option>)}
                    </select></div>
                 </div>

                 <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Life Status</label>
                 <div className="flex gap-2">
                    {["available", "sold", "unsold"].map(s => (
                       <button key={s} onClick={() => setFormData({...formData, status: s})} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${formData.status === s ? 'bg-violet-600 border-violet-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>{s}</button>
                    ))}
                 </div></div>

                 {formData.status === 'sold' && (
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2">
                       <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sold Price (₹)</label>
                       <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.soldPrice} onChange={e => setFormData({...formData, soldPrice: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Winning Node</label>
                       <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>
                          <option value="">Select Team</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                       </select></div>
                    </div>
                 )}

                 <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 accent-violet-500" checked={formData.isIcon} onChange={e => setFormData({...formData, isIcon: e.target.checked})} id="icon-edit" />
                    <label htmlFor="icon-edit" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer">Icon Player Status</label>
                 </div>

                 <button onClick={() => { setIsManageModalOpen(false); setIsConfirmModalOpen(true); }} className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all">Stage Override</button>
              </div>
           </div>
        </div>
      )}

      {/* ── SECURITY CONFIRMATION ── */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-[#0f172a] border border-red-500/20 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20"><AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" /></div>
                 <div><h3 className="text-xl font-black text-white">Manual Write?</h3><p className="text-xs text-slate-500 mt-2">You are modifying sensitive live data for <span className="text-white font-black">{editingPlayer.name}</span>.</p></div>
                 <div className="space-y-1.5 text-left"><label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Type &quot;CONFIRM&quot; to proceed</label>
                 <input className="w-full bg-slate-900 border border-red-500/20 rounded-xl px-4 py-3 text-center text-sm font-black text-red-400 outline-none" placeholder="CONFIRM" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} /></div>
                 <div className="flex gap-2"><button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-600">Abort</button>
                 <button disabled={confirmText !== 'CONFIRM'} onClick={handleFinalConfirm} className="flex-1 py-3 bg-red-600 disabled:opacity-20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Commit</button></div>
              </div>
           </div>
        </div>
      )}

      {/* ── IMAGE EDIT MODAL ── */}
      {editImageTarget && (
        <ImageEditModal
          title={`Edit Photo: ${editImageTarget.name}`}
          initialImage={editImageTarget.url}
          onClose={() => setEditImageTarget(null)}
          onSave={async (file) => {
             // Handle photo update via S3 and PATCH
             try {
                // 1. Get upload URL
                const fileType = file.type;
                const { uploadUrl, fileUrl } = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`).then(r => r.json());
                
                // 2. Upload to S3
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                // 3. Update DB
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageUrl: fileUrl })
                });

                if (res.ok) {
                   socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                   fetchData();
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
