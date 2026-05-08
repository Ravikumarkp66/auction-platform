"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Star, Trophy, Users, ShieldCheck, User, Search, Hash, AlertCircle, Edit3, FileSpreadsheet, Upload, RefreshCw, X, Camera, Trash2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import { API_URL, getProxiedImageUrl } from "../../../lib/apiConfig";
import ImageEditModal from "../../../components/ImageEditModal";

let socket;

export default function IconPlayersPanel() {
  const { selectedAuction } = useAuction();
  const { data: session } = useSession();
  const [icons, setIcons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, name }
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState([]); // Store parsed CSV data for display
  const [editingPlayer, setEditingPlayer] = useState(null); // New state for editing name & details
  const [isDeleteRangeModalOpen, setIsDeleteRangeModalOpen] = useState(false);
  const [deleteRange, setDeleteRange] = useState({ from: "", to: "" });

  // Year logic removed as per user request to restore old system

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchIcons();
      // Initialize socket connection
      socket = io(API_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } else {
      setLoading(false);
    }
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [selectedAuction]);

  // Handle CSV Import for Icons (same logic as tournament creation)
  const handleImportIcons = async (e) => {
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
          // First try exact matches
          for (const k of keys) {
            const f = rk.find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
            if (f) return row[f];
          }
          // Then try includes
          for (const k of keys) {
            const f = rk.find(key => key.toLowerCase().includes(k.toLowerCase()));
            if (f) return row[f];
          }
          return null;
        };

        const proxyUrl = (url) => {
          return getProxiedImageUrl(url);
        };

        const importedIcons = [];
        const tableData = [];

        data.forEach((row, rowIndex) => {
          const teamName = row["TEAM NAME"] || findValue(row, ["team name", "team", "ತಂಡ", "ತಂಡದ ಹೆಸರು"]);

          if (!teamName) return;

          const possibleIconNames = ["Captain Name", "Vice Captain Name", "Retain Player Name", "icon name", "name", "player name", "ಆಟಗಾರನ ಹೆಸರು", "ಹೆಸರು"];
          const rowImageUrl = findValue(row, ["photo", "image", "imageUrl", "link", "url", "ಭಾವಚಿತ್ರ"]);
          const rowMobile = findValue(row, ["mobile", "phone", "contact", "ಮೊಬೈಲ್", "ದೂರವಾಣಿ"]) || "-";
          const rowVillage = findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-";

          possibleIconNames.forEach(key => {
            const val = findValue(row, [key]);
            if (val && val.toLowerCase() !== "yes" && val.toLowerCase() !== "no") {
              const icon = {
                name: val,
                mobile: rowMobile,
                imageUrl: rowImageUrl || "",
                role: "All-Rounder",
                village: rowVillage,
                age: 0,
                teamName: teamName.trim(),
                iconRole: null,
                isIcon: true
              };
              importedIcons.push(icon);
              tableData.push({ ...icon, type: 'Icon' });
            }
          });
        });

        if (tableData.length > 0) {
          setImportedData(tableData);
        }

        if (importedIcons.length > 0) {
          const teamsRes = await fetch(`${API_URL}/api/teams?tournamentId=${selectedAuction._id}`);
          const teamsData = await teamsRes.json();
          const teamMap = {};
          teamsData.forEach(t => {
            teamMap[t.name.toLowerCase().trim()] = t._id;
          });

          const playersWithTeamIds = importedIcons.map(icon => ({
            ...icon,
            team: teamMap[icon.teamName.toLowerCase()] || null
          }));

          const res = await fetch(`${API_URL}/api/players/import`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.accessToken}`
            },
            body: JSON.stringify({
              players: playersWithTeamIds,
              tournamentId: selectedAuction._id
            })
          });

          if (res.ok) {
            const result = await res.json();
            alert(`Successfully added ${result.added} icon players! (Skipped ${result.skipped} duplicates)`);
            fetchIcons();
            if (socket && socket.connected) {
              socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
            }
          } else {
            alert("Failed to import icon players");
          }
        } else {
          alert("No icon players found in CSV");
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Error parsing file");
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const fetchIcons = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/api/players?tournamentId=${selectedAuction._id}&isIcon=true`),
        fetch(`${API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
      ]);

      if (!pRes.ok) {
        const errorText = await pRes.text();
        throw new Error(`Failed to fetch players: ${pRes.status} ${errorText}`);
      }
      if (!tRes.ok) {
        const errorText = await tRes.text();
        throw new Error(`Failed to fetch teams: ${tRes.status} ${errorText}`);
      }

      const pData = await pRes.json();
      const tData = await tRes.json();

      // Filter for icons only
      const iconPlayers = pData.filter(p => p.isIcon);
      setIcons(iconPlayers);
      setTeams(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRange = async () => {
    if (!deleteRange.from || !deleteRange.to) {
      alert("Please enter both 'From' and 'To' indices");
      return;
    }
    const start = parseInt(deleteRange.from) - 1; // 0-indexed
    const end = parseInt(deleteRange.to) - 1;

      const iconsToDelete = filteredIcons.slice(start, end + 1);
      if (iconsToDelete.length === 0) {
        alert("No icons found in this range");
      return;
    }

      if (!confirm(`Are you sure you want to delete ${iconsToDelete.length} icons (from Row ${deleteRange.from} to Row ${deleteRange.to})? This cannot be undone.`)) return;

      try {
      const res = await fetch(`${API_URL}/api/players/bulk-delete`, {
        method: "POST",
      headers: {
        "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.accessToken}`
        },
      body: JSON.stringify({playerIds: iconsToDelete.map(p => p._id) }),
      });

      if (res.ok) {
        alert("Icons deleted successfully");
      setIsDeleteRangeModalOpen(false);
      setDeleteRange({from: "", to: "" });
      fetchIcons();
      if (socket && socket.connected) {
        socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
        }
      }
    } catch (err) {
        alert("Error deleting range");
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t._id === (teamId?._id || teamId));
      return team ? team.name : "Unassigned";
  };

      const filteredIcons = icons
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.iconId || 0) - (b.iconId || 0));

      if (!selectedAuction) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-white/5 rounded-[3rem] text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500/50 mb-4" />
        <h2 className="text-xl font-black text-white">No Auction Selected</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs font-semibold">Select an auction system from the topbar to view icon rosters.</p>
      </div>
      );
  }

      return (
      <div className="space-y-10 max-w-7xl mx-auto pb-20">

        {/* ── HEADER AREA ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-4xl text-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
              <Star className="w-8 h-8 fill-yellow-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Icon <span className="text-yellow-500">Players</span> List</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">Pre-Retained Players for Selected Tournament</p>
            </div>
          </div>

          <div className="relative group min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
            <input
              placeholder="Search icon roster..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 font-bold text-white focus:border-yellow-500 outline-none transition-all placeholder:text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsDeleteRangeModalOpen(true)}
              className="p-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all active:scale-95 shadow-xl"
              title="Delete Range"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <label
              className="px-6 py-3.5 bg-linear-to-r from-yellow-600 to-amber-500 border border-yellow-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? "Processing..." : "Upload CSV"}
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportIcons} disabled={isImporting} />
            </label>
          </div>
        </div>

        {/* ── PARSED DATA TABLE ── */}
        {importedData.length > 0 && (
          <div className="bg-[#111827]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Parsed <span className="text-yellow-500">Icon Data</span></h2>
              <button
                onClick={() => setImportedData([])}
                className="p-2 hover:bg-white/5 rounded-full"
              >
                <AlertCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Team</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Number</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Village</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importedData.map((row, idx) => (
                    <tr key={idx} className="group hover:bg-white/2 transition-all">
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-white">{row.teamName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${row.type === 'Captain' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                          row.type === 'Vice Captain' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {row.imageUrl ? (
                            <img src={getProxiedImageUrl(row.imageUrl)} alt={row.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">
                              {row.name?.[0] || 'P'}
                            </div>
                          )}
                          <span className="text-sm font-bold text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-400">{row.mobile}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-400">{row.village || "-"}</span>
                      </td>
                      <td className="px-6 py-4">
                        {row.imageUrl ? (
                          <a href={row.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-yellow-500 hover:text-yellow-400 hover:underline">
                            View Photo →
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">No Photo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-6 bg-white/2 border-t border-white/5 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-400">
                Total Icons: <span className="text-yellow-500 font-black">{importedData.length}</span>
              </p>
              <button
                onClick={() => setImportedData([])}
                className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all"
              >
                Clear Table
              </button>
            </div>
          </div>
        )}

        {/* ── ELITE ROSTER GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIcons.map((p) => (
            <div key={p._id} className="relative group overflow-hidden bg-[#111827]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 hover:border-yellow-500/30 transition-all duration-500 shadow-2xl">

              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[60px] rounded-full pointer-events-none" />

              {/* Profile Header */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div
                      onClick={() => setEditImageTarget({ id: p._id, url: p.imageUrl, name: p.name })}
                      className="w-20 h-20 rounded-4xl overflow-hidden border-2 border-yellow-500/20 shadow-xl group-hover:scale-110 transition-transform duration-700 cursor-pointer relative group/img"
                    >
                      {p.imageUrl ? (
                        <img
                          src={getProxiedImageUrl(p.imageUrl)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const parent = e.target.parentElement;
                            e.target.style.display = 'none';
                            if (parent && !parent.querySelector('.fallback-initial')) {
                              const span = document.createElement('span');
                              span.className = 'fallback-initial text-3xl font-black text-slate-600 uppercase';
                              span.innerText = p.name?.[0] || 'P';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-3xl text-slate-600">
                          {p.name?.[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                        <Edit3 className="w-6 h-6 text-yellow-500" />
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-lg shadow-yellow-500/20 z-10">
                      ⭐ ICON
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 uppercase tracking-widest inline-flex items-center gap-1">
                      ICON ID: {p.iconId}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer(p);
                      }}
                      className="p-2 bg-white/5 hover:bg-yellow-500/20 rounded-xl text-slate-400 hover:text-yellow-500 transition-all border border-white/5 hover:border-yellow-500/30 shadow-lg"
                      title="Edit Player Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white group-hover:text-yellow-500 transition-colors uppercase leading-none">{p.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{p.role}</p>
                </div>
              </div>

              {/* Allocation Matrix */}
              <div className="px-8 py-6 bg-white/2 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Village</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white truncate">{p.village || "-"}</p>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Team</p>
                  <div className="flex items-center justify-end gap-2">
                    <Trophy className="w-3.5 h-3.5 text-yellow-500/60" />
                    <p className="text-sm font-black text-white">{getTeamName(p.team)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-30 italic font-black uppercase tracking-[0.5em] text-slate-500">
              No Icon Players Found
            </div>
          )}
        </div>

        {/* ── DELETE RANGE MODAL ── */}
        {isDeleteRangeModalOpen && (
          <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsDeleteRangeModalOpen(false)} />
            <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Delete <span className="text-red-500">Icon Range</span>
              </h3>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">From Row Number</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-500 transition-all"
                    value={deleteRange.from}
                    onChange={e => setDeleteRange({ ...deleteRange, from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">To Row Number</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-red-500 transition-all"
                    value={deleteRange.to}
                    onChange={e => setDeleteRange({ ...deleteRange, to: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  Note: This will delete icon players based on their current order in the list (from row X to row Y).
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteRangeModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRange}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/20 transition-all"
                >
                  Delete Range
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMAGE EDIT MODAL ── */}
        {editImageTarget && (
          <ImageEditModal
            title={`Edit Photo: ${editImageTarget.name}`}
            initialImage={getProxiedImageUrl(editImageTarget.url)}
            onClose={() => setEditImageTarget(null)}
            onSave={async (file) => {
              try {
                const fileType = file.type;
                const response = await fetch(`${API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`);
                if (!response.ok) throw new Error(`Upload URL failed: ${response.status}`);
                const { uploadUrl, fileUrl } = await response.json();

                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });

                const res = await fetch(`${API_URL}/api/players/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageUrl: fileUrl })
                });

                if (res.ok) {
                  socket?.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                  fetchIcons();
                } else {
                  const errorData = await res.json().catch(() => ({ message: "Update failed" }));
                  throw new Error(errorData.message || "Failed to update player image");
                }
              } catch (err) {
                console.error("Photo update failed", err);
                alert("Photo update failed");
              }
            }}
          />
        )}

        {/* ── PLAYER EDIT MODAL (Name & Details) ── */}
        {editingPlayer && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingPlayer(null)} />
            <div className="relative w-full max-w-md bg-[#111827] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white">Edit <span className="text-yellow-500">Player</span></h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Modify registry records</p>
                  </div>
                  <button onClick={() => setEditingPlayer(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                      <input
                        type="text"
                        value={editingPlayer.name}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-yellow-500 outline-none transition-all"
                        placeholder="Enter name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mobile</label>
                      <input
                        type="text"
                        value={editingPlayer.mobile || ""}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, mobile: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-yellow-500 outline-none transition-all"
                        placeholder="Mobile number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Village</label>
                      <input
                        type="text"
                        value={editingPlayer.village || ""}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, village: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-yellow-500 outline-none transition-all"
                        placeholder="Village name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Primary Role</label>
                      <select
                        value={editingPlayer.role}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, role: e.target.value })}
                        className="w-full bg-[#1e293b] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-yellow-500 outline-none transition-all"
                      >
                        <option value="All-Rounder" className="bg-[#1e293b] text-white">All-Rounder</option>
                        <option value="Batting All-Rounder" className="bg-[#1e293b] text-white">Batting All-Rounder</option>
                        <option value="Bowling All-Rounder" className="bg-[#1e293b] text-white">Bowling All-Rounder</option>
                        <option value="Batsman" className="bg-[#1e293b] text-white">Batsman</option>
                        <option value="Opening Batsman" className="bg-[#1e293b] text-white">Opening Batsman</option>
                        <option value="Middle Order Batsman" className="bg-[#1e293b] text-white">Middle Order Batsman</option>
                        <option value="Bowler" className="bg-[#1e293b] text-white">Bowler</option>
                        <option value="Fast Bowler" className="bg-[#1e293b] text-white">Fast Bowler</option>
                        <option value="Spin Bowler" className="bg-[#1e293b] text-white">Spin Bowler</option>
                        <option value="Wicket-Keeper" className="bg-[#1e293b] text-white">Wicket-Keeper</option>
                        <option value="Wicket-Keeper Batsman" className="bg-[#1e293b] text-white">Wicket-Keeper Batsman</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Icon Role</label>
                      <select
                        value={editingPlayer.iconRole || "none"}
                        onChange={(e) => setEditingPlayer({ ...editingPlayer, iconRole: e.target.value === "none" ? null : e.target.value })}
                        className="w-full bg-[#1e293b] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white focus:border-yellow-500 outline-none transition-all"
                      >
                        <option value="none" className="bg-[#1e293b] text-white">Standard Icon</option>
                        <option value="captain" className="bg-[#1e293b] text-white">Captain</option>
                        <option value="viceCaptain" className="bg-[#1e293b] text-white">Vice Captain</option>
                        <option value="retained" className="bg-[#1e293b] text-white">Retained</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => {
                        const target = { id: editingPlayer._id, url: editingPlayer.imageUrl, name: editingPlayer.name };
                        setEditingPlayer(null);
                        setEditImageTarget(target);
                      }}
                      className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-yellow-500" />
                      Change Photo
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to remove this player from the elite registry?")) {
                          try {
                            const res = await fetch(`${API_URL}/api/players/${editingPlayer._id}`, {
                              method: "DELETE"
                            });
                            if (res.ok) {
                              socket?.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                              fetchIcons();
                              setEditingPlayer(null);
                            } else {
                              const errorData = await res.json().catch(() => ({ message: "Delete failed" }));
                              alert(`Delete failed: ${errorData.message || res.statusText}`);
                            }
                          } catch (err) {
                            console.error("Delete failed", err);
                          }
                        }
                      }}
                      className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      Delete Player
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={async () => {
                      try {
                        setIsImporting(true);
                        const res = await fetch(`${API_URL}/api/players/${editingPlayer._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: editingPlayer.name,
                            role: editingPlayer.role,
                            mobile: editingPlayer.mobile,
                            village: editingPlayer.village,
                            iconRole: editingPlayer.iconRole
                          })
                        });

                        if (res.ok) {
                          socket?.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                          fetchIcons();
                          setEditingPlayer(null);
                        } else {
                          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                          alert(`Failed to update player: ${errorData.message || res.statusText}`);
                        }
                      } catch (err) {
                        console.error("Save failed", err);
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    disabled={isImporting}
                    className="w-full py-4 bg-linear-to-r from-yellow-600 to-amber-500 border border-yellow-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isImporting ? "Processing..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      );
}
