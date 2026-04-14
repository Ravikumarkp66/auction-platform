"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck, AlertTriangle, Users, Search, 
  ArrowLeft, Loader2, RefreshCw, Trash2, 
  Eye, X, MapPin, Activity, Calendar,
  RotateCcw, Phone, CreditCard, ExternalLink, Download
} from "lucide-react";
import Link from "next/link";
import { useAuction } from "../layout";
import { API_URL } from "../../../lib/apiConfig";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function RegistryAuditPage() {
  const { selectedAuction } = useAuction();
  const [data, setData] = useState({ mobileConflicts: [], aadhaarConflicts: [] });
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [view, setView] = useState("MOBILE"); // MOBILE | AADHAAR | TRASH
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const downloadPosterAsImage = async (p) => {
    setIsCapturing(true);
    const element = document.getElementById("audit-poster-canvas");
    if (!element) return;
    
    try {
        const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 3, 
            backgroundColor: "#0f172a",
            logging: false,
            onclone: (doc) => {
               // Universal Color Sanitizer (Fix for Tailwind v4 oklch/oklab)
               const allElements = doc.getElementsByTagName("*");
               for (let i = 0; i < allElements.length; i++) {
                  const el = allElements[i];
                  const computedStyle = window.getComputedStyle(el);
                  
                  if (computedStyle.color.includes("okl")) el.style.color = "#ffffff";
                  if (computedStyle.backgroundColor.includes("okl")) el.style.backgroundColor = "#0f172a";
                  if (computedStyle.borderColor.includes("okl")) el.style.borderColor = "#1e293b";
               }

               const p = doc.getElementById("audit-poster-canvas");
               if (p) {
                  p.style.color = "#ffffff";
                  p.style.backgroundColor = "#0f172a";
               }
            }
        });
        const data = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${p.name}_Official_Poster.png`;
        link.href = data;
        link.click();
    } catch (err) {
        console.error("Poster export failed", err);
    } finally {
        setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (selectedAuction) fetchAudit();
  }, [selectedAuction, view]);

  const getImgUrl = (p) => {
    if (!p) return "/placeholder-player.png";
    const url = p.imageUrl || p.photo?.s3 || p.photo?.drive;
    if (!url) return "/placeholder-player.png";
    
    if (url.startsWith("/uploads")) {
       return `${API_URL}${url}`;
    }
    
    return `${API_URL}/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const fetchAudit = async () => {
    setLoading(true);
    try {
      if (view === "TRASH") {
        const res = await fetch(`${API_URL}/api/players/audit/trash?tournamentId=${selectedAuction._id}`);
        if (res.ok) setTrash(await res.json());
      } else {
        const res = await fetch(`${API_URL}/api/players/audit/duplicates?tournamentId=${selectedAuction._id}`);
        if (res.ok) setData(await res.json());
      }
    } catch {}
    setLoading(false);
  };

  const downloadPlayerCard = async (p) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, 120] // Vertical ID Card Size
    });

    const getBase64 = async (url) => {
        try {
            const res = await fetch(`${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`);
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    };

    // Card Background
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 85, 120, "F");

    // Header Glow
    doc.setFillColor(124, 58, 237); // Violet
    doc.ellipse(42.5, 0, 60, 30, "F");

    // Player Image
    const imgData = await getBase64(p.imageUrl);
    if (imgData) {
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(12.5, 15, 60, 60, 10, 10, "F");
        doc.addImage(imgData, "JPEG", 15, 17.5, 55, 55);
    }

    // Name & Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(p.name.toUpperCase(), 42.5, 85, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFont("helvetica", "normal");
    doc.text(p.role.toUpperCase(), 42.5, 92, { align: "center" });

    // ID Badge
    doc.setFillColor(124, 58, 237);
    doc.roundedRect(27.5, 98, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`ID #${p.applicationId}`, 42.5, 103, { align: "center" });

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(selectedAuction?.name?.toUpperCase() || "TOURNAMENT", 42.5, 112, { align: "center" });
    doc.text("PARMESHWAR CUP - OFFICIAL ID", 42.5, 115, { align: "center" });

    doc.save(`${p.name}_Player_Card.pdf`);
  };

  const handleSoftDelete = async (id) => {
    if (!confirm("Move this player to Recycle Bin?")) return;
    try {
      const res = await fetch(`${API_URL}/api/players/${id}`, { method: "DELETE" });
      if (res.ok) fetchAudit();
    } catch {}
  };

  const handleRestore = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/players/audit/restore/${id}`, { method: "PUT" });
      if (res.ok) fetchAudit();
    } catch {}
  };

  if (!selectedAuction) return (
    <div className="h-[80vh] flex items-center justify-center p-6 text-center">
       <div className="space-y-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-black text-white uppercase italic">Context Required</h2>
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Select an auction to audit registry</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20 p-6 selection:bg-red-500/30">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <Link href="/admin/dashboard" className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors">
                  <ArrowLeft size={16} />
               </Link>
               <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] leading-none">Security Protocol</p>
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Registry <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">Auditor</span></h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-3">{selectedAuction.name}</p>
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={fetchAudit}
              className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg"
            >
               <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
         </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-6">
           <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] italic">Scanning Data Resource Nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
           
           <div className="lg:col-span-1 space-y-4">
               <div className="bg-[#111827] border border-white/10 rounded-[2.5rem] p-6 space-y-2 overflow-hidden relative shadow-2xl">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl pointer-events-none"></div>
                  
                  <button 
                    onClick={() => setView("MOBILE")}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${view === "MOBILE" ? 'bg-red-600/10 border border-red-500/20 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                  >
                     <div className="flex items-center gap-3">
                        <Phone size={16} />
                        <span className="text-[10px] font-black tracking-widest uppercase">Mobile Conflicts</span>
                     </div>
                     <span className="text-xs font-black">{data.mobileConflicts?.length || 0}</span>
                  </button>

                  <button 
                    onClick={() => setView("AADHAAR")}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${view === "AADHAAR" ? 'bg-red-600/10 border border-red-500/20 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                  >
                     <div className="flex items-center gap-3">
                        <CreditCard size={16} />
                        <span className="text-[10px] font-black tracking-widest uppercase">Aadhaar Conflicts</span>
                     </div>
                     <span className="text-xs font-black">{data.aadhaarConflicts?.length || 0}</span>
                  </button>

                  <div className="pt-4 border-t border-white/5">
                    <button 
                        onClick={() => setView("TRASH")}
                        className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${view === "TRASH" ? 'bg-yellow-600/10 border border-yellow-500/20 text-yellow-500' : 'bg-yellow-500/5 text-slate-600 hover:bg-yellow-500/10 hover:text-yellow-400'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Trash2 size={16} />
                            <span className="text-[10px] font-black tracking-widest uppercase">Recycle Bin</span>
                        </div>
                        <span className="text-xs font-black">{trash.length}</span>
                    </button>
                  </div>
               </div>
           </div>

           <div className="lg:col-span-3 space-y-6">
              {view === "TRASH" ? (
                 trash.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-6 bg-white/5 border border-white/5 border-dashed rounded-[3rem]">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-800"><ShieldCheck size={40} /></div>
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Recycle bin is empty</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trash.map(p => (
                            <div key={p._id} className="p-6 bg-[#111827]/80 border border-white/10 rounded-3xl group hover:border-yellow-500/30 transition-all flex items-center justify-between shadow-xl">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl overflow-hidden border border-white/10 shrink-0 grayscale opacity-40">
                                        <img src={p.imageUrl || p.photo?.s3 || p.photo?.drive || '/placeholder-player.png'} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase italic tracking-tighter opacity-60 line-through">{p.name}</p>
                                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Deleted: {new Date(p.deletedAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleRestore(p._id)}
                                    className="p-3 bg-emerald-600/10 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg flex items-center gap-2"
                                >
                                    <RotateCcw size={14} />
                                    <span className="text-[8px] font-black uppercase">Restore</span>
                                </button>
                            </div>
                        ))}
                    </div>
                 )
              ) : (view === "MOBILE" ? data.mobileConflicts : data.aadhaarConflicts).length === 0 ? (
                 <div className="h-96 flex flex-col items-center justify-center gap-6 bg-white/5 border border-white/5 border-dashed rounded-[3rem]">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-emerald-500/30 border border-emerald-500/10"><ShieldCheck size={40} /></div>
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">Clean state: no conflicts detected</p>
                 </div>
              ) : (
                <div className="space-y-12">
                   {(view === "MOBILE" ? data.mobileConflicts : data.aadhaarConflicts).map((group, gIdx) => (
                      <div key={gIdx} className="space-y-4">
                         <div className="flex items-center gap-4 px-4">
                            <div className="h-0.5 flex-1 bg-white/5"></div>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] italic leading-none">{view === "MOBILE" ? "COLLISION NODE" : "ID NODE"}: {group._id}</span>
                            <div className="h-0.5 flex-1 bg-white/5"></div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.players.map(p => (
                               <div key={p._id} className="p-6 bg-[#111827]/80 border border-white/10 rounded-3xl group hover:border-violet-500/30 transition-all flex items-center justify-between shadow-xl">
                                  <div className="flex items-center gap-5">
                                     <div className="w-14 h-14 bg-white/5 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                        <img src={p.imageUrl || p.photo?.s3 || p.photo?.drive || '/placeholder-player.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                     </div>
                                     <div>
                                        <p className="text-xs font-black text-white uppercase italic tracking-tighter">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{p.status}</span>
                                           <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">APP #{p.applicationId}</span>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <button onClick={() => setSelectedPlayer(p)} className="p-3 bg-violet-600/10 text-violet-400 rounded-xl hover:bg-violet-600 hover:text-white transition-all shadow-lg"><Eye size={16} /></button>
                                     <button onClick={() => handleSoftDelete(p._id)} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg"><Trash2 size={16} /></button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
              )}
           </div>

        </div>
      )}

      {/* ── Verification Modal ── */}
      {selectedPlayer && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="max-w-4xl w-full bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
                <button onClick={() => setSelectedPlayer(null)} className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 transition-all z-20"><X size={20} /></button>
                <div className="grid grid-cols-1 md:grid-cols-12">
                   <div className="md:col-span-5 bg-black/40 p-10 flex flex-col items-center gap-8 justify-center border-r border-white/5">
                      <div id="audit-poster-canvas" style={{ backgroundColor: '#0f172a' }} className="p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-6">
                         <div className="text-center">
                            <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#a78bfa] opacity-80">PARMESHWAR CUP</h2>
                            <h1 className="text-sm font-black text-white italic tracking-tighter uppercase">Official Poster</h1>
                         </div>
                         <img 
                           src={selectedPlayer.imageUrl || selectedPlayer.photo?.s3 || selectedPlayer.photo?.drive || '/placeholder-player.png'} 
                           crossOrigin="anonymous" 
                           className="w-56 h-56 object-cover rounded-[2.5rem] border-4 border-white/10 shadow-xl" 
                         />
                         <div className="text-center space-y-1">
                            <h3 className="text-2xl font-black text-white italic tracking-tighter leading-none">{selectedPlayer.name}</h3>
                            <p className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest leading-none">ID #{selectedPlayer.applicationId}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                             <div className="text-center"><p className="text-[7px] font-black text-[#475569] uppercase">ROLE</p><p className="text-[9px] font-black text-white">{selectedPlayer.role}</p></div>
                             <div className="text-center"><p className="text-[7px] font-black text-[#475569] uppercase">STYLE</p><p className="text-[9px] font-black text-white">{selectedPlayer.battingStyle || "RHB"}</p></div>
                         </div>
                      </div>
                      <div className="w-full space-y-6">
                         <div className="p-5 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-all" onClick={() => window.open(selectedPlayer.aadhaarUrl, '_blank')}>
                            <div className="flex items-center justify-between mb-3"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aadhaar Evidence</p><ExternalLink size={12} className="text-violet-500" /></div>
                            {selectedPlayer.aadhaarUrl ? <img src={selectedPlayer.aadhaarUrl} className="w-full h-32 object-cover rounded-xl" /> : <div className="h-32 rounded-xl bg-slate-900 flex items-center justify-center text-[9px] font-black text-slate-800 uppercase italic">No identity proof attached</div>}
                         </div>
                      </div>
                   </div>
                   <div className="md:col-span-7 p-12 space-y-10">
                      <div>
                         <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.4em] mb-2 leading-none">Registry Record Verification</p>
                         <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">{selectedPlayer.name}</h2>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3">FATHER: {selectedPlayer.fatherName || "UNSPECIFIED"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                         <DetailNode icon={Phone} label="Mobile Node" value={selectedPlayer.mobile} />
                         <DetailNode icon={CreditCard} label="Aadhaar ID" value={selectedPlayer.aadhaarNumber} />
                         <DetailNode icon={MapPin} label="Regional Sector" value={`${selectedPlayer.taluk} > ${selectedPlayer.hobli}`} />
                         <DetailNode icon={Activity} label="Village / Ward" value={selectedPlayer.village} />
                         <DetailNode icon={Activity} label="Skill Profile" value={`${selectedPlayer.role} (${selectedPlayer.battingStyle || selectedPlayer.playingStyle})`} />
                         <DetailNode icon={Activity} label="Wicket Keeper" value={selectedPlayer.wicketKeeper ? "YES (ACTIVE)" : "NO (INACTIVE)"} color={selectedPlayer.wicketKeeper ? "text-emerald-400" : "text-red-400"} />
                      </div>
                      <div className="pt-10 border-t border-white/5 flex flex-wrap gap-4">
                        <button 
                          onClick={() => downloadPosterAsImage(selectedPlayer)} 
                          className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2"
                          disabled={isCapturing}
                        >
                           {isCapturing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download size={14} />}
                           {isCapturing ? "Capturing..." : "Download Poster (Image)"}
                        </button>
                        <button onClick={() => downloadPlayerCard(selectedPlayer)} className="px-6 py-5 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:scale-105 transition-all flex items-center gap-2">
                           <Download size={14} /> Download PDF ID
                        </button>
                        <button onClick={() => setSelectedPlayer(null)} className="flex-1 py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Done</button>
                        <button onClick={() => { handleSoftDelete(selectedPlayer._id); setSelectedPlayer(null); }} className="px-8 py-5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Deactivate Record</button>
                      </div>
                   </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

function DetailNode({ icon: Icon, label, value, color="text-white" }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 opacity-40"><Icon size={12} className="text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div>
            <p className={`text-xs font-bold uppercase tracking-widest truncate ${color}`}>{value || "---"}</p>
        </div>
    );
}
