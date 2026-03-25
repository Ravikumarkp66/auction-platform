"use client";

import { useState, useEffect } from "react";
import { Star, Trophy, Users, ShieldCheck, User, Search, Hash, AlertCircle, Edit3, FileSpreadsheet, Upload, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";

let socket;

export default function IconPlayersPanel() {
  const { selectedAuction } = useAuction();
  const [icons, setIcons] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, name }
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState([]); // Store parsed CSV data for display

  // Helper: Convert category label to year number
  const getYearNumberFromLabel = (category) => {
    if (!category) return 4;
    const cat = category.toLowerCase();
    if (cat.includes("1st") || cat.includes("1") || cat.includes("first")) return 1;
    if (cat.includes("2nd") || cat.includes("2") || cat.includes("second")) return 2;
    if (cat.includes("3rd") || cat.includes("3") || cat.includes("third")) return 3;
    if (cat.includes("4th") || cat.includes("4") || cat.includes("fourth")) return 4;
    return 4; // default
  };

  // Helper: Get year label from number
  const getYearLabel = (yearNum) => {
    switch(yearNum) {
      case 1: return "1st Year";
      case 2: return "2nd Year";
      case 3: return "3rd Year";
      case 4: return "4th Year";
      default: return "4th Year";
    }
  };

  // Helper: Get year badge color
  const getYearBadgeColor = (yearNum) => {
    switch(yearNum) {
      case 1: return "#10b981"; // green
      case 2: return "#3b82f6"; // blue
      case 3: return "#f59e0b"; // amber
      case 4: return "#ef4444"; // red
      default: return "#6b7280"; // gray
    }
  };

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchIcons();
      // Initialize socket connection
      socket = io(process.env.NEXT_PUBLIC_API_URL, {
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
          for (const k of keys) {
            const f = rk.find(key => key.toLowerCase().trim() === k.toLowerCase().trim());
            if (f) return row[f];
          }
          return null;
        };

        // Helper: Calculate year from USN (for 2026 tournament)
        const calculateYearFromUSN = (usnStr) => {
          if (!usnStr || typeof usnStr !== 'string') return "4th year";
          const match = usnStr.match(/2[0-9]/);
          if (match) {
            const yr = parseInt(match[0], 10);
            const diff = 26 - yr;
            if (diff === 3) return "3rd year";
            if (diff === 2) return "2nd year";
            if (diff >= 4) return "4th year";
          }
          return "4th year"; // Default to 4th for unknown
        };

        // Proxy function for Drive links
        const proxyUrl = (url) => {
          if (!url) return "";
          if (typeof url !== 'string') return url;
          if (url.includes('drive.google.com')) {
            return `https://auction-kp.sitesys.in/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
          }
          return url;
        };

        const importedIcons = [];
        const tableData = []; // For displaying parsed data

        // Process each row - Extract ONLY: Team, Captain, VC, Retained, Year
        data.forEach((row, rowIndex) => {
          console.log(`\n=== ROW ${rowIndex} ===`);
          console.log('Full row data:', JSON.stringify(row, null, 2));
          console.log('Available keys:', Object.keys(row));
          
          const teamName = row["TEAM NAME"] || findValue(row, ["team name", "name", "team", "ತಂಡ"]);
          
          console.log('Extracted team name:', teamName);
          
          if (!teamName) {
            console.warn(`⚠️ Row ${rowIndex}: Could not find team name!`);
            console.log('Trying to find any key with "team" or "name":');
            Object.keys(row).forEach(key => {
              if (key.toLowerCase().includes('team') || key.toLowerCase().includes('name')) {
                console.log(`   Found: "${key}" = "${row[key]}"`);
              }
            });
            return;
          }

          // Extract Captain - Name and Year only
          const capName = findValue(row, ["Captain Name", "captain name", "capt name", "C Name", "captain"]);
          const capYear = findValue(row, ["Captain Year", "captain year", "cap year", "C Year", "year"]);
          
          if (capName && capName.toLowerCase() !== "yes" && capName.toLowerCase() !== "no") {
            const capIcon = {
              name: capName,
              mobile: "-",
              imageUrl: "",
              role: "All-Rounder",
              category: capYear || "4th year",
              village: "-",
              age: 0,
              teamName: teamName.trim(),
              iconRole: "captain",
              isIcon: true
            };
            importedIcons.push(capIcon);
            tableData.push({ ...capIcon, type: 'Captain' });
          }

          // Extract Vice-Captain - Name and Year only
          const vcName = findValue(row, ["Vice Captain Name", "vice captain name", "vc name", "vice name", "VC Name", "vice captain"]);
          const vcYear = findValue(row, ["Vice Captain Year", "vice captain year", "vc year", "VC Year", "year"]);
          
          if (vcName && vcName.toLowerCase() !== "yes" && vcName.toLowerCase() !== "no") {
            const vcIcon = {
              name: vcName,
              mobile: "-",
              imageUrl: "",
              role: "All-Rounder",
              category: vcYear || "4th year",
              village: "-",
              age: 0,
              teamName: teamName.trim(),
              iconRole: "viceCaptain",
              isIcon: true
            };
            importedIcons.push(vcIcon);
            tableData.push({ ...vcIcon, type: 'Vice Captain' });
          }

          // Extract ONE Retained Player - Name and Year only
          const retName = findValue(row, [`Retain Player Name`, `retained name`, `ret name`, `retained player`, `retained`]);
          const retYear = findValue(row, [`Retain Player Year`, `retained year`, `ret year`, `year`]);
          
          if (retName && retName.toLowerCase() !== "yes" && retName.toLowerCase() !== "no") {
            const retIcon = {
              name: retName,
              mobile: "-",
              imageUrl: "",
              role: "All-Rounder",
              category: retYear || "4th year",
              village: "-",
              age: 0,
              teamName: teamName.trim(),
              iconRole: "retained",
              isIcon: true
            };
            importedIcons.push(retIcon);
            tableData.push({ ...retIcon, type: 'Retained' });
          }
        });

        // Store parsed data for display
        if (tableData.length > 0) {
          setImportedData(tableData);
        }

        if (importedIcons.length > 0) {
          // First, get all teams to map team names to IDs
          const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`);
          const teamsData = await teamsRes.json();
          const teamMap = {};
          teamsData.forEach(t => {
            teamMap[t.name.toLowerCase().trim()] = t._id;
          });

          // Map team names to team IDs for proper assignment
          const playersWithTeamIds = importedIcons.map(icon => ({
            ...icon,
            team: teamMap[icon.teamName] || null // Add team ID for proper association
          }));

          // Bulk import icons
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              players: playersWithTeamIds, 
              tournamentId: selectedAuction._id 
            })
          });

          if (res.ok) {
            const result = await res.json();
            alert(`Successfully added ${result.added} icon players! (Skipped ${result.skipped} duplicates)`);
            fetchIcons();
            // Emit socket event only if socket is connected
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
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const fetchIcons = async () => {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players?tournamentId=${selectedAuction._id}&isIcon=true`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
      ]);
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
         <h2 className="text-xl font-black text-white">No Auction Registry Context</h2>
         <p className="text-slate-500 text-sm mt-2 max-w-xs font-semibold">Select an auction system from the topbar to view icon rosters.</p>
       </div>
     );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      
      {/* ── HEADER AREA ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-[2rem] text-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
              <Star className="w-8 h-8 fill-yellow-500" />
           </div>
           <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Icon <span className="text-yellow-500">Node</span> Registry</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">System Privilege Level 1: Elite Personnel</p>
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

        <label 
          className="px-6 py-3.5 bg-gradient-to-r from-yellow-600 to-amber-500 border border-yellow-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isImporting ? "Processing..." : "Upload CSV"}
          <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportIcons} disabled={isImporting} />
        </label>
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">USN</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Number</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Year</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {importedData.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-white">{row.teamName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                        row.type === 'Captain' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                        row.type === 'Vice Captain' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                          <img src={row.imageUrl} alt={row.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <User className="w-8 h-8 rounded-lg bg-slate-800 p-1.5 text-slate-600" />
                        )}
                        <span className="text-sm font-bold text-white">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-400">{row.applicationId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-400">{row.mobile}</span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        // Use the category field directly instead of calculating from USN
                        const yearNum = getYearNumberFromLabel(row.category);
                        const yearLabel = getYearLabel(yearNum);
                        const badgeColor = getYearBadgeColor(yearNum);
                        
                        return (
                          <span 
                            className="text-xs font-black px-3 py-1 rounded-xl border"
                            style={{ 
                              background: `${badgeColor}15`,
                              borderColor: `${badgeColor}30`,
                              color: badgeColor
                            }}
                          >
                            {yearLabel}
                          </span>
                        );
                      })()}
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
          <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
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
                        className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-yellow-500/20 shadow-xl group-hover:scale-110 transition-transform duration-700 cursor-pointer relative group/img"
                     >
                        {p.imageUrl ? (
                           <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
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
                  
                  <div className="text-right">
                     <div className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20 uppercase tracking-widest inline-flex items-center gap-1">
                        ICON ID: {p.iconId}
                     </div>
                  </div>
               </div>

               <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white group-hover:text-yellow-500 transition-colors uppercase leading-none">{p.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{p.role}</p>
               </div>
            </div>

            {/* Allocation Matrix */}
            <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deployment Node</p>
                  <div className="flex items-center gap-2">
                     <Trophy className="w-3.5 h-3.5 text-yellow-500/60" />
                     <p className="text-sm font-black text-white truncate">{getTeamName(p.team)}</p>
                  </div>
               </div>
               <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access Key</p>
                  <div className="flex items-center justify-end gap-2">
                     <p className="text-sm font-black text-white">{p.teamSlotId || "PRE-PROCESSED"}</p>
                     <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
               </div>
            </div>
          </div>
        ))}

        {filteredIcons.length === 0 && (
           <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-30 italic font-black uppercase tracking-[0.5em] text-slate-500">
              No Elite Units Authorized
           </div>
        )}
      </div>

      {/* ── IMAGE EDIT MODAL ── */}
      {editImageTarget && (
        <ImageEditModal
          title={`Edit Icon: ${editImageTarget.name}`}
          initialImage={editImageTarget.url}
          onClose={() => setEditImageTarget(null)}
          onSave={async (file) => {
             try {
                const fileType = file.type;
                const { uploadUrl, fileUrl } = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`).then(r => r.json());
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageUrl: fileUrl })
                });

                if (res.ok) {
                   socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                   fetchIcons();
                }
             } catch (err) {
                console.error("Photo update failed", err);
                alert("Photo update failed");
             }
          }}
        />
      )}
    </div>
  );
}
