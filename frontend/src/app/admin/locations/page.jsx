"use client";

import { useState, useEffect } from "react";
import { 
  Navigation2, MapPin, Plus, Trash2, Search,
  ChevronRight, ArrowLeft, Loader2, Filter, AlertCircle,
  Database, Sparkles, UserPlus, MoveUp, MoveDown, Shuffle
} from "lucide-react";
import Link from "next/link";
import { API_URL } from "../../../lib/apiConfig";

export default function LocationManagementPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Form State
  const [newLoc, setNewLoc] = useState({
    taluk: "",
    hobli: ""
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/location/all`);
      if (res.ok) setLocations(await res.json());
    } catch {}
    setLoading(false);
  };

  const handleAddLocation = async (e) => {
    if (e) e.preventDefault();
    if (!newLoc.taluk || !newLoc.hobli) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLoc)
      });
      if (res.ok) {
        setNewLoc({ ...newLoc, hobli: "" });
        fetchLocations();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to add node.");
      }
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this hobli from global registry?")) return;
    try {
      const res = await fetch(`${API_URL}/api/location/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchLocations();
    } catch {}
  };

  const moveItem = async (index, direction) => {
    const newItems = [...locations];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap locally
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setLocations(newItems);
    
    // Sync with backend
    syncOrder(newItems);
  };

  const shuffleOrder = async () => {
    if (!confirm("Randomize registry order? This will shuffle how locations appear in dropdowns.")) return;
    const shuffled = [...locations].sort(() => Math.random() - 0.5);
    setLocations(shuffled);
    syncOrder(shuffled);
  };

  const syncOrder = async (orderedList) => {
    setReordering(true);
    try {
        await fetch(`${API_URL}/api/location/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: orderedList.map(l => l._id) })
        });
    } catch (err) { console.error("Reorder sync failed"); }
    finally { setReordering(false); }
  };

  const filtered = locations.filter(l => 
    l.taluk.toLowerCase().includes(search.toLowerCase()) ||
    l.hobli.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20 p-6 selection:bg-violet-500/30">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <Link href="/admin/dashboard" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
                  <ArrowLeft size={16} />
               </Link>
               <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.4em] leading-none">Registry Control</p>
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Regional <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">Registry</span></h1>
         </div>

         <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-violet-500 transition-colors" size={16} />
                <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="SEARCH REGISTRY..."
                className="w-full bg-slate-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-violet-500/40 font-black text-[10px] tracking-widest placeholder:text-slate-800"
                />
            </div>
            <button 
              onClick={shuffleOrder}
              className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
               <Shuffle size={14} className="text-violet-500" />
               Shuffle Order
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         
         {/* ── Simplified Add Form ── */}
         <div className="lg:col-span-1">
            <div className="sticky top-10 space-y-6">
                <div className="bg-[#111827] border border-white/10 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[60px] pointer-events-none"></div>
                   
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-violet-600 rounded-2xl text-white shadow-lg shadow-violet-600/20"><Plus size={20} /></div>
                      <div>
                         <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Registry Deployment</h3>
                         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 opacity-70 italic">Phase: Taluk & Hobli Setup</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                           01. TALUK NAME {newLoc.taluk && <Sparkles size={10} className="text-violet-500" />}
                         </label>
                         <input 
                           autoFocus
                           value={newLoc.taluk}
                           onChange={e => setNewLoc({...newLoc, taluk: e.target.value.toUpperCase()})}
                           placeholder="E.G. KORATAGERE" 
                           className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-5 outline-none focus:border-violet-500 font-bold text-xs uppercase tracking-widest transition-all"
                         />
                      </div>

                      {newLoc.taluk && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                           <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                              02. HOBLI NAME {newLoc.hobli && <Sparkles size={10} className="text-cyan-500" />}
                           </label>
                           <div className="relative">
                              <input 
                                value={newLoc.hobli}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddLocation(); }}
                                onChange={e => setNewLoc({...newLoc, hobli: e.target.value.toUpperCase()})}
                                placeholder="E.G. KOLALA" 
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-5 outline-none focus:border-cyan-500 font-bold text-xs uppercase tracking-widest transition-all"
                              />
                              <button 
                                onClick={handleAddLocation}
                                disabled={!newLoc.hobli || submitting}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-0"
                              >
                                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                              </button>
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="p-6 bg-emerald-600/5 border border-emerald-500/10 rounded-3xl flex gap-4">
                   <CheckCircle className="shrink-0 text-emerald-500" size={18} />
                   <div className="space-y-1">
                       <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">Regional Integrity</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed tracking-widest">
                          Set the manual order using side arrows. Dropout order in player forms will reflect this sequence.
                       </p>
                   </div>
                </div>
            </div>
         </div>

         {/* ── Data List ── */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-600/10 rounded-lg text-violet-500"><Database size={16} /></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{filtered.length} Registry Entries</span>
               </div>
               {reordering && <div className="flex items-center gap-2 text-[9px] font-black text-violet-400 animate-pulse uppercase tracking-[0.2em]"><RefreshCw size={10} className="animate-spin" /> Synchronizing Order...</div>}
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-[2.5rem] border border-white/5">
                   <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                   <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">Establishing Connection...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
                   <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-800"><MapPin size={32} /></div>
                   <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Empty registry</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                   {filtered.map((l, index) => (
                      <div key={l._id} className="group flex items-center justify-between p-7 bg-[#111827]/60 backdrop-blur-3xl border border-white/5 rounded-3xl hover:border-white/10 transition-all hover:bg-slate-900/80 shadow-lg relative">
                         
                         {/* Manual Order Controls */}
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-2">
                             <button onClick={() => moveItem(index, -1)} className="p-1.5 bg-slate-800 hover:bg-violet-600 rounded-md text-white transition-colors disabled:opacity-20" disabled={index === 0}><MoveUp size={12} /></button>
                             <button onClick={() => moveItem(index, 1)} className="p-1.5 bg-slate-800 hover:bg-violet-600 rounded-md text-white transition-colors disabled:opacity-20" disabled={index === filtered.length - 1}><MoveDown size={12} /></button>
                         </div>

                         <div className="flex items-center gap-8 pl-4">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-violet-500 transition-all border border-white/5 group-hover:rotate-12">
                               <MapPin size={24} />
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-2">
                                  <span className="px-2 py-0.5 bg-violet-600/10 rounded-md text-[9px] font-black text-violet-500 uppercase tracking-widest">{l.taluk}</span>
                                  <ChevronRight size={10} className="text-slate-800" />
                               </div>
                               <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{l.hobli}</h4>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleDelete(l._id)}
                           className="w-12 h-12 bg-white/0 hover:bg-red-500/10 rounded-2xl flex items-center justify-center text-transparent group-hover:text-red-500/60 hover:!text-red-500 transition-all border border-transparent group-hover:border-red-500/10"
                         >
                            <Trash2 size={18} />
                         </button>
                      </div>
                   ))}
                </div>
            )}
         </div>

      </div>

    </div>
  );
}

function CheckCircle({ size, className }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

function RefreshCw({ size, className }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
