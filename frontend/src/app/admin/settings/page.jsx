"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, Save, User, Shield, Bell, Image as ImageIcon, Trash2, Upload, Trophy } from "lucide-react";
import { uploadToS3 } from "../../../lib/uploadToS3";

export default function AdminSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [backgrounds, setBackgrounds] = useState([]);
  const [tournamentPics, setTournamentPics] = useState([]);
  const [newBgName, setNewBgName] = useState("");
  const [newTpic, setNewTpic] = useState({ name: "", location: "", year: "2025", teams: "10 Teams" });
  const [settings, setSettings] = useState({
    siteName: "AuctionPro",
    siteDescription: "Professional Cricket Auction Platform",
    allowPublicViewing: true,
    requireAuthForBidding: true,
    autoSaveInterval: 30,
    emailNotifications: true,
    pushNotifications: false
  });

  useEffect(() => {
    fetchBackgrounds();
    fetchGallery();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backgrounds`);
      const data = await res.json();
      setBackgrounds(data);
    } catch (err) {
      console.error("Fetch backgrounds error:", err);
    }
  };

  const fetchGallery = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournament-images`);
      const data = await res.json();
      setTournamentPics(data.data || []);
    } catch (err) {
      console.error("Fetch gallery error:", err);
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newBgName.trim()) return alert("Please enter a name for this background first");

    setBgLoading(true);
    try {
      const imageUrl = await uploadToS3(file, "backgrounds");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backgrounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBgName, imageUrl })
      });

      if (res.ok) {
        setNewBgName("");
        fetchBackgrounds();
        alert("Background saved successfully!");
      } else {
        throw new Error("Failed to save background to database");
      }
    } catch (err) {
      console.error("Background upload error:", err);
      alert("Error: " + err.message);
    } finally {
      setBgLoading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newTpic.name.trim()) return alert("Please enter a tournament name first");

    setGalleryLoading(true);
    try {
      const imageUrl = await uploadToS3(file, "tournaments");
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournament-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTpic, imageUrl })
      });

      if (res.ok) {
        setNewTpic({ name: "", location: "", year: "2025", teams: "10 Teams" });
        fetchGallery();
        alert("Tournament image saved successfully!");
      } else {
        throw new Error("Failed to save tournament image to database");
      }
    } catch (err) {
      console.error("Gallery upload error:", err);
      alert("Error: " + err.message);
    } finally {
      setGalleryLoading(false);
    }
  };

  const deleteBg = async (id) => {
    if (!confirm("Are you sure you want to remove this background?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/backgrounds/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchBackgrounds();
    } catch (err) {
      console.error("Delete background error:", err);
    }
  };

  const deleteGalleryItem = async (id) => {
    if (!confirm("Are you sure you want to remove this tournament card?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournament-images/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchGallery();
    } catch (err) {
      console.error("Delete gallery error:", err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your platform settings and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-medium">
                {session?.user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{session?.user?.name}</p>
              <p className="text-slate-400 text-sm">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-violet-400" />
                <span className="text-violet-400 text-sm font-medium">Administrator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Background Management Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Platform Backgrounds</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase font-black tracking-widest">Manage images hosted on S3</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* List existing backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backgrounds.map((bg) => (
              <div key={bg._id} className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video">
                <img src={bg.imageUrl} alt={bg.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest">S3 Active Background</p>
                      <p className="text-sm font-black text-white">{bg.name}</p>
                    </div>
                    <button 
                      onClick={() => deleteBg(bg._id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {backgrounds.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center opacity-30 italic">
                <ImageIcon className="w-12 h-12 mb-3" />
                <p>No custom backgrounds uploaded yet</p>
              </div>
            )}
          </div>

          {/* Upload New Background */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Upload to S3</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Background Name (e.g. auction_bg)"
                value={newBgName}
                onChange={(e) => setNewBgName(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white outline-none focus:border-violet-500"
              />
              <label className={`cursor-pointer flex items-center justify-center gap-2 px-6 py-2 rounded-xl border transition-all ${bgLoading ? 'bg-slate-700 border-slate-600' : 'bg-violet-600 hover:bg-violet-500 border-violet-500'}`}>
                {bgLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-bold">Choose Image</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleBgUpload}
                  disabled={bgLoading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Tournament Gallery Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Tournament Gallery</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 uppercase font-black tracking-widest">Manage promo cards shown in dashboard</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* List existing gallery items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournamentPics.map((pic) => (
              <div key={pic._id} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-[4/5]">
                <img src={pic.imageUrl} alt={pic.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                  <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">{pic.year} • {pic.location}</p>
                  <p className="text-sm font-black text-white uppercase tracking-tighter truncate">{pic.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400 font-bold">{pic.teams}</span>
                    <button 
                      onClick={() => deleteGalleryItem(pic._id)}
                      className="p-1 px-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded text-[10px] font-black uppercase transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tournamentPics.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center opacity-30 italic">
                <Trophy className="w-12 h-12 mb-3" />
                <p>No tournament cards in gallery</p>
              </div>
            )}
          </div>

          {/* Add New Gallery Item Form */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Add New Tournament Card</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Tournament Name"
                value={newTpic.name}
                onChange={(e) => setNewTpic({...newTpic, name: e.target.value})}
                className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-violet-500"
              />
              <input 
                type="text" 
                placeholder="Location"
                value={newTpic.location}
                onChange={(e) => setNewTpic({...newTpic, location: e.target.value})}
                className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-violet-500"
              />
              <input 
                type="text" 
                placeholder="Year (e.g. 2025)"
                value={newTpic.year}
                onChange={(e) => setNewTpic({...newTpic, year: e.target.value})}
                className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-violet-500"
              />
              <input 
                type="text" 
                placeholder="Teams (e.g. 10 Teams)"
                value={newTpic.teams}
                onChange={(e) => setNewTpic({...newTpic, teams: e.target.value})}
                className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-violet-500"
              />
            </div>
            
            <label className={`w-full cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-xl border transition-all ${galleryLoading ? 'bg-slate-700 border-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-900/20'}`}>
              {galleryLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="font-bold">Upload & Add to Gallery</span>
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleGalleryUpload}
                disabled={galleryLoading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">General Settings</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Site Description
            </label>
            <textarea
              value={settings.siteDescription}
              onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Allow Public Viewing</p>
              <p className="text-slate-400 text-sm">Anyone can view live auctions without signing in</p>
            </div>
            <button
              onClick={() => setSettings({...settings, allowPublicViewing: !settings.allowPublicViewing})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowPublicViewing ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowPublicViewing ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Require Auth for Bidding</p>
              <p className="text-slate-400 text-sm">Users must be authenticated to place bids</p>
            </div>
            <button
              onClick={() => setSettings({...settings, requireAuthForBidding: !settings.requireAuthForBidding})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireAuthForBidding ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireAuthForBidding ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-slate-400 text-sm">Receive email updates about auction activity</p>
            </div>
            <button
              onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-slate-400 text-sm">Browser notifications for live events</p>
            </div>
            <button
              onClick={() => setSettings({...settings, pushNotifications: !settings.pushNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.pushNotifications ? "bg-violet-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pushNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Auto-save Interval (seconds)
            </label>
            <input
              type="number"
              value={settings.autoSaveInterval}
              onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value) || 30})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              min="10"
              max="300"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
