"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Upload, CheckCircle, AlertCircle, Trash2, Camera } from "lucide-react";
import { API_URL } from "../../../lib/apiConfig";

export default function BrandingAdmin() {
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      if (data.success && data.data.brandLogo) {
        setPreview(`${API_URL}${data.data.brandLogo}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setPreview(URL.createObjectURL(file));
       setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!logo) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", logo);

      const res = await fetch(`${API_URL}/api/settings/upload-logo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Brand logo updated successfully!" });
        // Update global state or refresh
      } else {
        setMessage({ type: "error", text: data.message || "Upload failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error during upload." });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove custom logo and return to default?")) return;
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "brandLogo", value: null })
      });
      if (res.ok) {
        setPreview(null);
        setLogo(null);
        setMessage({ type: "success", text: "Custom logo removed. Using system default." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <LayoutDashboard className="w-8 h-8 text-violet-500" />
             Brand Identity
           </h1>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Logo & Visual Branding</p>
        </div>
      </div>

      <div className="bg-[#111827]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] pointer-events-none" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Logo Preview Section */}
            <div className="space-y-6">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 block mb-4">Current Platform Logo</label>
                <div className="relative group w-full aspect-video bg-slate-900/50 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all hover:border-violet-500/30">
                    {preview ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8">
                             <img src={preview} alt="Logo Preview" className="max-w-full max-h-full object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all group-hover:scale-105" />
                             <button 
                               onClick={handleRemove}
                               className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-3 p-10">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-relaxed"> No Custom Logo<br/><span className="text-[10px] opacity-60">Using System Default SVG</span></p>
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed">
                  Recommended: Transparent PNG or SVG. <br/>
                  Ideal size: 250px x 80px. Max size 2MB.
                </p>
            </div>

            {/* Upload Section */}
            <div className="space-y-8">
                <div>
                   <h3 className="text-xl font-black text-white mb-2">Upload Branding Asset</h3>
                   <p className="text-sm text-slate-400 font-medium leading-relaxed">Change the visual identity across the main portal, player cards, and admin dashboard.</p>
                </div>

                {message && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{message.text}</p>
                  </div>
                )}

                <div className="space-y-4">
                   <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="hidden" 
                        id="logo-upload" 
                      />
                      <label 
                        htmlFor="logo-upload" 
                        className="flex items-center justify-center gap-3 w-full py-4 border-2 border-white/5 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest text-slate-300 border-dashed"
                      >
                         <Upload className="w-4 h-4" /> Select Image File
                      </label>
                   </div>

                   <button
                     onClick={handleUpload}
                     disabled={!logo || uploading}
                     className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800/50 disabled:cursor-not-allowed py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-violet-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                   >
                     {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                     {uploading ? "Broadcasting Brand..." : "Deploy New Logo"}
                   </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
