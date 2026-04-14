"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Trophy, Play, Eye, Edit, Trash2, Users, 
  Calendar, RotateCcw, PlusCircle, Clock, 
  CheckCircle, Zap, ExternalLink, RefreshCw
} from "lucide-react";

import * as XLSX from "xlsx";
import { API_URL } from "@/lib/apiConfig";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(null);
  const [appending, setAppending] = useState(null);
  const [activating, setActivating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchTournaments();
    const interval = setInterval(() => {
        // Poll if any tournament is processing images
        const isProcessing = tournaments.some(t => t.imageProcessing?.status === 'processing');
        if (isProcessing) fetchTournaments();
    }, 5000);
    return () => clearInterval(interval);
  }, [tournaments]);

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tournaments`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTournaments(data);
      } else {
        setTournaments([]);
      }
    } catch (err) {
      console.error("Failed to fetch tournaments:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetAuction = async (tournamentId) => {
    if (!confirm("Are you sure you want to reset the auction?\n\nThis will:\n- Keep icon players in their teams\n- Reset all sold players back to auction pool\n- Reset all team budgets\n\nThis action cannot be undone!")) {
      return;
    }

    setResetting(tournamentId);
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Auction reset successfully!\n\n- ${data.iconPlayersRetained} icon players retained\n- ${data.auctionPlayersReset} auction players reset\n- ${data.teamsReset} teams reset`);
        fetchTournaments();
      } else {
        alert("Failed to reset auction");
      }
    } catch (err) {
      console.error("Error resetting auction:", err);
      alert("Error resetting auction");
    } finally {
      setResetting(null);
    }
  };

  const goLive = async (tournamentId) => {
    if (!confirm("Make this tournament LIVE? This will archive any other currently live auctions.")) {
        return;
    }
    setActivating(tournamentId);
    try {
        const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/go-live`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
            fetchTournaments();
        } else {
            alert("Failed to set live");
        }
    } catch (err) {
        console.error("Go live error:", err);
    } finally {
        setActivating(null);
    }
  };

  const archiveAuction = async (tournamentId) => {
    if (!confirm("Are you sure you want to mark this auction as COMPLETED? It will no longer show up as a live option.")) {
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/archive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
            fetchTournaments();
        }
    } catch (err) {
        console.error("Archive error:", err);
    }
  };

  const deleteAuction = async (tournamentId) => {
    const password = prompt("🚨 PERMANENT DELETION 🚨\n\nThis will completely erase the auction, all players, teams, and permanently delete all uploaded images/logos from the cloud server.\n\nEnter Admin Password to confirm deletion:");
    if (!password) return;

    setDeleting(tournamentId);
    try {
      const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        alert("Auction completely deleted from database and cloud.");
        fetchTournaments();
      } else {
        const data = await res.json();
        alert(`Failed to delete: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Server error while trying to delete auction.");
    } finally {
      setDeleting(null);
    }
  };

  const handleAppendPlayers = async (tournamentId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAppending(tournamentId);
    try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: true });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            
            // Map keys helper (similar to create-tournament)
            const findValue = (row, keys) => {
                const rk = Object.keys(row);
                for (const k of keys) {
                    const f = rk.find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
                    if (f) return row[f];
                }
                return null;
            };

            const players = rows.map(row => ({
                name:         findValue(row, ["player name", "playerName", "name", "player", "ಆಟಗಾರನ ಹೆಸರು"]) || "PLAYER NAME",
                role:         findValue(row, ["playing role", "role", "skill", "player role", "category", "type", "position", "ಪಾತ್ರ"]) || "All-Rounder",
                mobile:       findValue(row, ["mobile", "phone", "contact", "ಮೊಬೈಲ್", "ದೂರವಾಣಿ"]) || "-",
                battingStyle: findValue(row, ["batting", "battingStyle", "style", "ಬ್ಯಾಟಿಂಗ್"]) || "Right Hand",
                bowlingStyle: findValue(row, ["bowling", "bowlingStyle", "ಬೌಲಿಂಗ್"]) || "-",
                village:      findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
                basePrice:    Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || 100,
                imageUrl:     findValue(row, ["imageUrl", "photo", "image", "link", "url", "ಭಾವಚಿತ್ರ"]) || "",
                isIcon:       findValue(row, ["icon", "isIcon", "star"]) === "yes" || findValue(row, ["isIcon"]) === true
            }));

            const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/append-players`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Successfully added ${data.added} new players! (Skipped ${data.skipped} duplicates)`);
                fetchTournaments();
            } else {
                alert("Failed to append players");
            }
            setAppending(null);
        };
        reader.readAsBinaryString(file);
    } catch (err) {
        console.error("Append error:", err);
        alert("File error");
        setAppending(null);
    }
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "active":
      case "live":
        return { 
          color: "text-red-400", 
          bg: "bg-red-500/10", 
          border: "border-red-500/20", 
          icon: <Zap className="w-3 h-3 animate-pulse" />,
          label: "Live" 
        };
      case "upcoming":
        return { 
          color: "text-blue-400", 
          bg: "bg-blue-500/10", 
          border: "border-blue-500/20", 
          icon: <Clock className="w-3 h-3" />,
          label: "Upcoming" 
        };
      case "completed":
        return { 
          color: "text-emerald-400", 
          bg: "bg-emerald-500/10", 
          border: "border-emerald-500/20", 
          icon: <CheckCircle className="w-3 h-3" />,
          label: "Completed" 
        };
      default:
        return { 
          color: "text-slate-400", 
          bg: "bg-slate-500/10", 
          border: "border-slate-500/20", 
          icon: <Calendar className="w-3 h-3" />,
          label: status 
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Tournaments</p>
      </div>
    );
  }

  const liveTournaments = tournaments.filter(t => t.status === "active" || t.status === "live");
  const concludedTournaments = tournaments.filter(t => t.status === "completed");
  const otherTournaments = tournaments.filter(t => t.status !== "active" && t.status !== "live" && t.status !== "completed");

  const renderTournamentCard = (t) => {
    const meta = getStatusMeta(t.status);
    const tournamentId = t._id || t.id;
    return (
      <div key={tournamentId} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/60 backdrop-blur-xl hover:border-white/20 transition-all duration-300">
        {/* Status Badge */}
        <div className="absolute top-6 right-6 z-10">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${meta.bg} ${meta.color} ${meta.border}`}>
            {meta.icon}
            {meta.label}
          </div>
        </div>

        <div className="p-5 flex items-start gap-4">
          {/* Tournament Logo */}
          <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
            {t.organizerLogo ? (
              <img src={t.organizerLogo} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Trophy className="w-6 h-6 text-slate-700" />
            )}
          </div>

          {/* Title Section */}
          <div className="flex-1 pr-16 text-left">
            <h3 className="text-base font-black text-white group-hover:text-violet-400 transition-colors truncate">
              {t.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs font-semibold">
              <Calendar className="w-3 h-3" />
              {new Date(t.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {t.organizerName && (
               <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">{t.organizerName}</p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5">

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
              <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1.5" />
              <p className="text-base font-black text-white">{t.numTeams || t.teams || 0}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Teams</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
              <Trophy className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1.5" />
              <p className="text-base font-black text-white">{t.playerCount || t.players?.length || 0}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Players</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1.5" />
              <p className="text-base font-black text-white">
                ₹{((t.baseBudget || 10000) / 1000).toFixed(0)}k
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Budget</p>
            </div>
          </div>

          {/* IMAGE PROCESSING PROGRESS */}
          {t.imageProcessing?.status === "processing" && (
            <div className="mb-6 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter text-slate-400">
                <span>Image Conversion</span>
                <span>{t.imageProcessing.completed} / {t.imageProcessing.total}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${(t.imageProcessing.completed / (t.imageProcessing.total || 1)) * 100}%` }}
                  />
              </div>
            </div>
          )}

          {/* Live Banner / Activation */}
          {t.status === "active" ? (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Active Auction</p>
                  <button 
                    onClick={() => archiveAuction(tournamentId)}
                    className="text-[8px] text-slate-500 font-bold hover:text-red-400 transition-colors uppercase tracking-tighter underline underline-offset-2"
                  >
                    Mark as Concluded
                  </button>
                </div>
                <Zap className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <button 
                onClick={() => goLive(tournamentId)}
                disabled={activating === tournamentId}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-[9px] uppercase tracking-wider border transition-all ${
                  t.status === "completed" 
                  ? "bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/20"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20"
                }`}
              >
                {activating === tournamentId ? <Clock className="w-3 h-3 animate-spin"/> : <Play className="w-3 h-3"/>}
                {t.status === "completed" ? "Retry to Live" : "Set As Live Auction"}
              </button>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center gap-3">
            {t.status === "active" ? (
              <>
                <Link
                  href={`/live-auction?id=${tournamentId}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black text-[10px] uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5" /> Control
                </Link>
                <Link
                  href={`/overlay?id=${tournamentId}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/live-auction?id=${tournamentId}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </Link>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 border border-white/5">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              </>
            )}

            <div className="flex shrink-0 gap-2">
              <label className="p-3 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all active:scale-95 cursor-pointer" title="Add More Players (Excel)">
                {appending === tournamentId ? <RefreshCw className={`w-4 h-4 animate-spin`} /> : <PlusCircle className="w-4 h-4" />}
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleAppendPlayers(tournamentId, e)} />
              </label>
              <button 
                onClick={() => resetAuction(tournamentId)}
                disabled={resetting === tournamentId}
                className="p-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                title="Reset Auction Pool"
              >
                <RotateCcw className={`w-4 h-4 ${resetting === tournamentId ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => deleteAuction(tournamentId)}
                disabled={deleting === tournamentId}
                className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                title="Permanently Delete Auction"
              >
                <Trash2 className={`w-4 h-4 ${deleting === tournamentId ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Tournaments <span className="text-violet-500">History</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and monitor all your auction events</p>
        </div>
        <Link
          href="/admin/create-tournament"
          className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 hover:scale-105 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Create New
        </Link>
      </div>

      {/* ── LIVE AUCTIONS SECTION ── */}
      {liveTournaments.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500 animate-pulse" />
              Live Auctions
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveTournaments.map(renderTournamentCard)}
          </div>
        </section>
      )}

      {/* ── CONCLUDED AUCTIONS SECTION ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Concluded Auctions
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        </div>
        
        {concludedTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concludedTournaments.map(renderTournamentCard)}
          </div>
        ) : (
          <div className="py-20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-40">
            <Trophy className="w-12 h-12 text-slate-500 mb-4" />
            <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">No concluded auctions yet</p>
          </div>
        )}
      </section>

      {/* ── OTHER/DRAFT SECTION (Optional) ── */}
      {otherTournaments.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              Draft / Upcoming
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-500/20 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherTournaments.map(renderTournamentCard)}
          </div>
        </section>
      )}

      {tournaments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-50">🏟️</div>
          <h3 className="text-xl font-black text-white">No Tournaments Found</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto">You haven&apos;t created any auctions yet. Start by building your first one!</p>
          <Link
            href="/admin/create-tournament"
            className="mt-8 px-8 py-3 bg-violet-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-violet-600/20 hover:bg-violet-500 transition-all active:scale-95"
          >
            Create Your First Tournament
          </Link>
        </div>
      )}
    </div>
  );
}
