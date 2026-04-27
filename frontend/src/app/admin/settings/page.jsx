"use client";

import { useState, useEffect } from "react";
import { 
  Settings, Image, Layout, Shield, Bell, 
  PlusCircle, Trash2, CheckCircle, RefreshCw,
  Eye, Info, Palette, Camera, Upload, AlertCircle
} from "lucide-react";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { useAuction } from "../layout";
import { API_URL } from "../../../lib/apiConfig";

// ── Toggle Component ──────────────────────────────────────
const Toggle = ({ active, onToggle }) => (
  <button 
    onClick={onToggle}
    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${active ? 'bg-violet-600' : 'bg-slate-700'}`}
  >
    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${active ? 'left-6' : 'left-1'}`} />
  </button>
);

// ── Section Component ─────────────────────────────────────
const Section = ({ title, desc, icon: Icon, children }) => (
  <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden">
    <div className="px-8 py-6 border-b border-white/5 flex items-center gap-4">
      <div className="p-3 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{desc}</p>
      </div>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

export default function AdminSettings() {
  const { selectedAuction } = useAuction();
  const [backgrounds, setBackgrounds] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [auctionConfig, setAuctionConfig] = useState({
    startingBid: 0,
    bidIncrement: 0,
    auctionMode: 'money'
  });
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchAssets();
      setAuctionConfig({
        startingBid: selectedAuction.startingBid || 0,
        bidIncrement: selectedAuction.bidIncrement || 0,
        auctionMode: selectedAuction.auctionMode || 'money'
      });
    } else {
      setLoading(false);
    }
  }, [selectedAuction]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [bgRes, imgRes] = await Promise.all([
        fetch(`${API_URL}/api/backgrounds?tournamentId=${selectedAuction._id}`),
        fetch(`${API_URL}/api/tournament-images?tournamentId=${selectedAuction._id}`)
      ]);
      const bgData = await bgRes.json();
      const imgData = await imgRes.json();
      setBackgrounds(bgData);
      setImages(imgData.data || []);
    } catch (err) {
      console.error("Asset fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !selectedAuction) return;

    setUploading(true);
    try {
      const url = await uploadToS3(file, type === 'bg' ? 'backgrounds' : 'gallery');
      
      const endpoint = type === 'bg' ? '/api/backgrounds' : '/api/tournament-images';
      const body = type === 'bg' 
        ? { name: `Custom_${Date.now()}`, imageUrl: url, tournamentId: selectedAuction._id }
        : { name: `Img_${Date.now()}`, location: "Unknown", year: "2026", teams: "All", imageUrl: url, tournamentId: selectedAuction._id };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) fetchAssets();
    } catch (err) {
      alert("Upload error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAuctionConfig = async () => {
    if (!selectedAuction) return;
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${selectedAuction._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionConfig)
      });
      if (res.ok) {
        alert("Auction configuration updated successfully!");
        // Update local storage so other components see the change
        const updated = { ...selectedAuction, ...auctionConfig };
        localStorage.setItem("selectedAuction", JSON.stringify(updated));
      } else {
        const data = await res.json();
        alert("Failed to update: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      alert("Save error: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  if (!selectedAuction) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
        <AlertCircle className="w-12 h-12 text-yellow-400 mb-4 opacity-50" />
        <h3 className="text-xl font-black text-white">No Auction Selected</h3>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm font-semibold">Please select an auction from the topbar to manage its specific assets and settings.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Loading {selectedAuction.name} Configuration</p>
    </div>
  );

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            System <span className="text-violet-500">Assets</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 opacity-60">Context: {selectedAuction.name}</p>
        </div>
        <button onClick={fetchAssets} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-400 transition-all">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Section title="Auction Engine" desc="Bidding and rule configuration" icon={Zap}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Starting Bid (Global Min)</p>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                   <input 
                     type="number" 
                     value={auctionConfig.startingBid}
                     onChange={e => setAuctionConfig({...auctionConfig, startingBid: Number(e.target.value)})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pl-10 font-black text-white outline-none focus:border-violet-500 transition-all"
                   />
                </div>
                <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Fallback if player base price is not set</p>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fixed Bid Increment</p>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                   <input 
                     type="number" 
                     value={auctionConfig.bidIncrement}
                     onChange={e => setAuctionConfig({...auctionConfig, bidIncrement: Number(e.target.value)})}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pl-10 font-black text-white outline-none focus:border-violet-500 transition-all"
                   />
                </div>
                <p className="text-[9px] text-slate-600 mt-2 font-bold uppercase">Applies to Money/RS mode auctions</p>
             </div>
             
             <button 
               onClick={handleSaveAuctionConfig}
               disabled={savingConfig}
               className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
             >
               {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
               Save Configuration
             </button>
          </div>
          
          <div className="bg-violet-600/10 border border-violet-500/20 rounded-3xl p-6 flex flex-col justify-center">
             <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-violet-400" />
                <h4 className="text-sm font-black text-white uppercase">Engine Behavior</h4>
             </div>
             <ul className="space-y-3">
                {[
                  "Starting bid acts as the global floor price",
                  "Increments are added to current bid on each click",
                  "Points mode uses custom band-based increments",
                  "Updates take effect immediately on the live stage"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
             </ul>
          </div>
        </div>
      </Section>

      <Section title="Auction Backgrounds" desc="Visual branding for the live stage" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {backgrounds.map(bg => (
            <div key={bg._id} className="group relative aspect-[16/9] rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-lg">
              <img src={bg.imageUrl} alt={bg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <div className="flex items-center justify-between gap-4">
                   <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{bg.name}</p>
                   </div>
                   <button className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all flex-shrink-0">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
              {bg.isActive && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-violet-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                  <CheckCircle className="w-3 h-3" /> Active
                </div>
              )}
            </div>
          ))}
          <label className="relative aspect-[16/9] rounded-[1.5rem] border-2 border-dashed border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 flex flex-col items-center justify-center cursor-pointer transition-all">
             {uploading ? <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" /> : <Upload className="w-8 h-8 text-violet-500/40" />}
             <span className="text-xs font-black text-violet-400/60 uppercase tracking-widest mt-4">Add Background</span>
             <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'bg')} />
          </label>
        </div>
      </Section>

      <Section title="Tournament Gallery" desc="Promotional and historical images" icon={Camera}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img._id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
              <img src={img.imageUrl} alt={img.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><Eye className="w-4 h-4" /></button>
                <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <label className="relative aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/30 bg-white/5 flex items-center justify-center cursor-pointer transition-all">
             <PlusCircle className="w-6 h-6 text-slate-600" />
             <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'gallery')} />
          </label>
        </div>
      </Section>

      <Section title="System Security" desc="Access control and monitoring" icon={Shield}>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wide">Admin Lockdown</p>
              <p className="text-xs text-slate-500">Prevent all other logins during live auction</p>
            </div>
            <Toggle active={true} />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wide">Public View</p>
              <p className="text-xs text-slate-500">Allow users to see auction results live</p>
            </div>
            <Toggle active={false} />
          </div>
        </div>
      </Section>
    </div>
  );
}
