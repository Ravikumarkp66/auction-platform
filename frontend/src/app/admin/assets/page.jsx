"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Upload, Check, Trash2, Library, PlusCircle, Layout, Palette, Users, Image as LucideImage } from "lucide-react";
import { useAuction } from "../layout";
import { API_URL } from "../../../lib/apiConfig";

export default function AssetManager() {
  const { selectedAuction } = useAuction();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("splash"); // splash, background, team_bg, squad_bg, badge

  // Local auction assets state
  const [auctionAssets, setAuctionAssets] = useState({
    splashUrl: "",
    backgroundUrl: "",
    teamCardBgUrl: "",
    squadBgUrl: "",
    badges: { leftBadge: "", rightBadge: "" }
  });

  useEffect(() => {
    if (selectedAuction?._id) {
       setAuctionAssets(selectedAuction.assets || {
         splashUrl: "",
         backgroundUrl: "",
         teamCardBgUrl: "",
         squadBgUrl: "",
         badges: { leftBadge: "", rightBadge: "" }
       });
       fetchLibrary();
    }
  }, [selectedAuction]);

  const fetchLibrary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/assets`);
      const data = await res.json();
      setLibrary(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get S3 signed URL
      const res = await fetch(`${API_URL}/api/upload/get-upload-url?fileName=${file.name}&fileType=${file.type}`);
      const { uploadUrl, fileUrl } = await res.json();

      // 2. Upload to S3
      await fetch(uploadUrl, { method: "PUT", body: file });

      // 3. Save to Global Library
      const assetRes = await fetch(`${API_URL}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type, url: fileUrl })
      });
      const newAsset = await assetRes.json();
      setLibrary([newAsset, ...library]);

      // 4. Auto-assign to current auction
      updateAuctionAsset(type, fileUrl);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateAuctionAsset = async (type, url) => {
    let updatedAssets = { ...auctionAssets };
    
    if (type === "splash") updatedAssets.splashUrl = url;
    else if (type === "background") updatedAssets.backgroundUrl = url;
    else if (type === "team_bg") updatedAssets.teamCardBgUrl = url;
    else if (type === "squad_bg") updatedAssets.squadBgUrl = url;
    else if (type === "badge_left") updatedAssets.badges.leftBadge = url;
    else if (type === "badge_right") updatedAssets.badges.rightBadge = url;

    setAuctionAssets(updatedAssets);

    // Save to DB
    try {
      await fetch(`${API_URL}/api/tournaments/${selectedAuction._id}/assets`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(updatedAssets)
      });
    } catch (err) { console.error(err); }
  };

  const deleteAsset = async (id) => {
    if (!confirm("Remove from library?")) return;
    try {
      await fetch(`${API_URL}/api/assets/${id}`, { method: "DELETE" });
      setLibrary(library.filter(a => a._id !== id));
    } catch (err) { console.error(err); }
  };

  const assetTabs = [
    { id: "splash", label: "Splash Screen", icon: LucideImage },
    { id: "background", label: "Main Background", icon: Layout },
    { id: "team_bg", label: "Team Card", icon: Palette },
    { id: "squad_bg", label: "Squad BG", icon: Users },
    { id: "badge", label: "Branding Badges", icon: PlusCircle },
  ];

  const getSelectedUrl = () => {
     if (activeTab === 'splash') return auctionAssets.splashUrl;
     if (activeTab === 'background') return auctionAssets.backgroundUrl;
     if (activeTab === 'team_bg') return auctionAssets.teamCardBgUrl;
     if (activeTab === 'squad_bg') return auctionAssets.squadBgUrl;
     return ""; // Badges handled separately in UI
  };

  if (!selectedAuction) return <div className="p-20 text-center text-slate-500">Select context...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-4xl font-black text-white">Auction <span className="text-emerald-500">Branding</span></h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2">Theme & Asset Management System</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
         
         {/* ── LEFT: NAVIGATION ── */}
         <div className="w-full lg:w-64 space-y-2">
            {assetTabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                   activeTab === tab.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
         </div>

         {/* ── RIGHT: GALLERY & CONTROL ── */}
         <div className="flex-1 space-y-8">
            
            {/* ACTIVE SELECTION PREVIEW */}
            <div className="bg-[#111827]/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 overflow-hidden relative group">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500"><Check className="w-5 h-5" /></div>
                     <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Active {activeTab.replace('_',' ')}</h3>
                        <p className="text-[10px] text-slate-500 font-bold">Currently deployed to Live Auction</p>
                     </div>
                  </div>
                  <label className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer transition-all">
                     <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload New"}
                     <input type="file" className="hidden" onChange={(e) => handleUpload(e, activeTab === 'badge' ? 'badge' : activeTab)} disabled={uploading} />
                  </label>
               </div>

               {activeTab !== 'badge' ? (
                  <div className="w-full h-60 rounded-3xl overflow-hidden bg-slate-900 border border-white/5 flex items-center justify-center relative shadow-inner">
                     {getSelectedUrl() ? (
                        <img 
                          src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(getSelectedUrl())}`} 
                          className="w-full h-full object-cover" 
                        />
                     ) : (
                        <div className="text-slate-700 italic font-bold">No Asset Selected</div>
                     )}
                  </div>
               ) : (
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Left Badge</p>
                        <div className="h-40 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center p-6 shadow-inner">
                           {auctionAssets.badges.leftBadge ? (
                             <img 
                               src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(auctionAssets.badges.leftBadge)}`} 
                               className="max-h-full object-contain" 
                             />
                           ) : (
                             <p className="text-xs text-slate-700 italic">Empty</p>
                           )}
                        </div>
                     </div>
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right pr-1">Right Badge</p>
                        <div className="h-40 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center p-6 shadow-inner">
                           {auctionAssets.badges.rightBadge ? (
                             <img 
                               src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(auctionAssets.badges.rightBadge)}`} 
                               className="max-h-full object-contain" 
                             />
                           ) : (
                             <p className="text-xs text-slate-700 italic">Empty</p>
                           )}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* LIBRARY GRID */}
            <div>
               <div className="flex items-center gap-3 mb-6">
                  <Library className="w-4 h-4 text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Global Asset Library</h3>
               </div>
               
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {library.filter(a => a.type === (activeTab === 'badge' ? 'badge' : activeTab)).map(asset => (
                     <div key={asset._id} className="group relative aspect-video bg-white/5 rounded-3xl border border-white/10 overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer">
                        <img 
                          src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(asset.url)}`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                           <button 
                             onClick={() => updateAuctionAsset(activeTab === 'badge' ? (auctionAssets.badges.leftBadge ? 'badge_right' : 'badge_left') : activeTab, asset.url)}
                             className="px-4 py-2 bg-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest text-white shadow-xl"
                           >Deploy Asset</button>
                           <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset._id); }} className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        {/* Deployed Indicator */}
                        {[auctionAssets.splashUrl, auctionAssets.backgroundUrl, auctionAssets.teamCardBgUrl, auctionAssets.squadBgUrl, auctionAssets.badges.leftBadge, auctionAssets.badges.rightBadge].includes(asset.url) && (
                           <div className="absolute top-2 left-2 bg-emerald-500 text-black px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">ACTIVE</div>
                        )}
                     </div>
                  ))}
               </div>
            </div>

         </div>
      </div>

    </div>
  );
}
