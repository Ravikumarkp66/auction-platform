"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Save, Plus, Trash2, Edit3, CheckCircle, AlertCircle } from "lucide-react";
import { API_URL } from "../../../lib/apiConfig";

export default function ServicesAdmin() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", price: "", icon: "💡", order: 0 });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/services`, { cache: 'no-store' });
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = editingId ? { ...formData, id: editingId } : formData;
      const res = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Service saved successfully!" });
        setFormData({ title: "", description: "", price: "", icon: "💡", order: 0 });
        setEditingId(null);
        fetchServices();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save service." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service._id);
    setFormData({
      title: service.title,
      description: service.description,
      price: service.price,
      icon: service.icon,
      order: service.order || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, { method: "DELETE" });
      if (res.ok) fetchServices();
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
             Pricing & Services
           </h1>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Manage Public Offerings</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-[#111827]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl pointer-events-none" />
        
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          {editingId ? <Edit3 className="w-5 h-5 text-yellow-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
          {editingId ? "Edit Service" : "Add New Service"}
        </h2>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-bold uppercase tracking-wider">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Service Title</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                placeholder="e.g., Player Auction Hosting"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Starting Price</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
                placeholder="e.g., ₹5,000 / day"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Description</label>
            <textarea
              required
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
              placeholder="Describe the hospitality and technical features included..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Icon (Emoji)</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl focus:border-violet-500/50 outline-none transition-all"
                value={formData.icon}
                onChange={e => setFormData({ ...formData, icon: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Display Order</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-violet-500/50 outline-none transition-all"
                value={formData.order}
                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "Update Service" : "Create Service"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List Card */}
      <div className="bg-[#111827]/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Offerings</h3>
        </div>
        
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Synchronizing Data...</div>
          ) : services.length === 0 ? (
             <div className="p-10 text-center text-slate-600 font-bold uppercase tracking-widest text-xs italic">No services listed in the system registry.</div>
          ) : services.map(service => (
            <div key={service._id} className="p-6 flex items-start gap-4 group hover:bg-white/5 transition-colors">
               <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                  {service.icon}
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                     <h4 className="text-lg font-black text-white truncate">{service.title}</h4>
                     <span className="text-violet-400 font-black text-sm">{service.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">{service.description}</p>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => handleEdit(service)}
                       className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 hover:text-white hover:border-violet-500/50 transition-all flex items-center gap-2"
                     >
                        <Edit3 className="w-3 h-3" /> EDIT
                     </button>
                     <button 
                       onClick={() => handleDelete(service._id)}
                       className="px-4 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10 text-[10px] font-black text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center gap-2"
                     >
                        <Trash2 className="w-3 h-3" /> DELETE
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
