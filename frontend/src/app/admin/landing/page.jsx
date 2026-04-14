"use client";

import { useState, useEffect } from "react";
import { 
  PlusCircle, Trash2, RefreshCw,
  Eye, Camera, Upload, AlertCircle, Home,
  Edit2, Check, X, Crop
} from "lucide-react";
import { uploadToS3 } from "../../../lib/uploadToS3";
import { API_URL } from "../../../lib/apiConfig";
import ImageCropperModal from "../../../components/ImageCropperModal";

// ── Section Component ─────────────────────────────────────
const Section = ({ title, desc, icon: Icon, children }) => (
  <div className="bg-[#111827]/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
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

export default function LandingSettings() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImageData, setNewImageData] = useState({
    name: "",
    location: "",
    year: new Date().getFullYear().toString(),
    teams: ""
  });

  // Edit State
  const [editingImage, setEditingImage] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tournament-images?tournamentId=landing&all=true`);
      const data = await res.json();
      setImages(data.data || []);
    } catch (err) {
      console.error("Asset fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/tournament-images/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) fetchAssets();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!newImageData.name || !newImageData.location) {
      alert("Please enter a name and location for this image first.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToS3(file, 'gallery');
      
      const body = { 
        ...newImageData,
        imageUrl: url, 
        tournamentId: null
      };

      const res = await fetch(`${API_URL}/api/tournament-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert("Success! New image added to the carousel.");
        fetchAssets();
        setNewImageData({
          name: "",
          location: "",
          year: new Date().getFullYear().toString(),
          teams: ""
        });
      } else {
        const errorData = await res.json();
        alert("Server Error: " + (errorData.message || "Failed to save image info"));
      }
    } catch (err) {
      alert("Upload error: " + err.message);
    } finally {
      setUploading(false);
      if (e && e.target) e.target.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this image from the home page?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/tournament-images/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchAssets();
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingImage) return;
    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/api/tournament-images/${editingImage._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingImage)
      });
      if (res.ok) {
        setEditingImage(null);
        fetchAssets();
      }
    } catch (err) {
      alert("Update error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Loading Landing Assets</p>
    </div>
  );

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Home <span className="text-violet-500">Carousel</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1 opacity-60">Manage images shown on the public landing page</p>
        </div>
        <button onClick={fetchAssets} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-slate-400 transition-all">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Section title="Add Image" desc="Upload new carousel slide" icon={Upload}>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tournament Name</label>
                <input 
                  type="text" 
                  value={newImageData.name}
                  onChange={e => setNewImageData({...newImageData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-violet-500 outline-none placeholder-slate-700"
                  placeholder="e.g. Jakanachari Cup"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Location</label>
                <input 
                  type="text" 
                  value={newImageData.location}
                  onChange={e => setNewImageData({...newImageData, location: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-violet-500 outline-none placeholder-slate-700"
                  placeholder="e.g. Tumkur"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Year</label>
                  <input 
                    type="text" 
                    value={newImageData.year}
                    onChange={e => setNewImageData({...newImageData, year: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-violet-500 outline-none placeholder-slate-700"
                    placeholder="2026"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Teams</label>
                  <input 
                    type="text" 
                    value={newImageData.teams}
                    onChange={e => setNewImageData({...newImageData, teams: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-violet-500 outline-none placeholder-slate-700"
                    placeholder="10 Teams"
                  />
                </div>
              </div>
              
              <label className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-xs transition-all border-2 border-dashed
                ${uploading ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-violet-500/40 cursor-pointer'}`}>
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploading ? "UPLOADING..." : "SELECT & UPLOAD PHOTO"}
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Current Carousel" desc="Shuffle or remove active slides" icon={Camera}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {images.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-slate-600 font-bold text-sm uppercase tracking-widest italic font-black">No images in carousel</p>
                </div>
              )}
              {images.map(img => (
                <div key={img._id} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                  <img src={img.imageUrl} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <div className="flex items-center justify-between gap-4">
                       <div className="min-w-0">
                         <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">{img.year} • {img.teams}</p>
                         <p className="text-sm font-black text-white truncate">{img.name}</p>
                       </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleToggleActive(img._id, img.isActive); }} 
                             className={`p-2 rounded-lg transition-all ${img.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500 hover:text-white'}`}
                             title={img.isActive ? "Turn OFF" : "Turn ON"}
                           >
                             <Check className={`w-4 h-4 ${!img.isActive && 'opacity-30'}`} />
                           </button>
                           <button onClick={() => setEditingImage(img)} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100">
                             <Edit2 className="w-4 h-4" />
                           </button>
                           <button onClick={() => handleDelete(img._id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  </div>
                  {!img.isActive && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hidden</span>
                    </div>
                  )}
                  {img.isActive && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-emerald-600/20 backdrop-blur-md rounded-full border border-emerald-500/30 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editingImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/30">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-none">Edit Slide</h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Asset ID: {editingImage._id.slice(-6).toUpperCase()}</p>
                  </div>
               </div>
               <button onClick={() => setEditingImage(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
               <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                  <img src={editingImage.imageUrl} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setIsCropping(true)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all gap-2 text-white font-black text-xs uppercase"
                  >
                    <Crop className="w-4 h-4" /> CROP IMAGE
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Tournament Name</label>
                    <input 
                      type="text" 
                      value={editingImage.name}
                      onChange={e => setEditingImage({...editingImage, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Location</label>
                    <input 
                      type="text" 
                      value={editingImage.location}
                      onChange={e => setEditingImage({...editingImage, location: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Year</label>
                      <input 
                        type="text" 
                        value={editingImage.year}
                        onChange={e => setEditingImage({...editingImage, year: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Teams</label>
                      <input 
                        type="text" 
                        value={editingImage.teams}
                        onChange={e => setEditingImage({...editingImage, teams: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>
               </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${editingImage.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                       <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white uppercase tracking-wide">Show on Home Page</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Visibility status of this slide</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingImage({...editingImage, isActive: !editingImage.isActive})}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${editingImage.isActive ? 'bg-violet-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${editingImage.isActive ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
             </div>

            <div className="px-8 py-6 bg-black/40 flex items-center gap-4 flex-shrink-0">
               <button onClick={() => setEditingImage(null)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase transition-all">
                  Cancel
               </button>
               <button onClick={handleUpdate} disabled={uploading} className="flex-1 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-violet-500/20 transition-all flex items-center justify-center gap-2">
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cropper Modal Integration ── */}
      {isCropping && editingImage && (
        <ImageCropperModal 
          imageUrl={editingImage.imageUrl}
          onClose={() => setIsCropping(false)}
          folder="gallery"
          initialAspect={16 / 9}
          onSave={(newUrl) => {
            setEditingImage({...editingImage, imageUrl: newUrl});
            setIsCropping(false);
          }}
        />
      )}
    </div>
  );
}
