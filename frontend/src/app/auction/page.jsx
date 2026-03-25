"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Hide number input spinners
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `;
  document.head.appendChild(style);
}
import Link from "next/link"
import * as XLSX from "xlsx"
import { uploadToS3 } from "../../lib/uploadToS3"

export default function AuctionDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // Dashboard & Navigation State - Move all hooks to top
  const [pastTournaments, setPastTournaments] = useState([])
  const [backendError, setBackendError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSessionReady, setIsSessionReady] = useState(false)
  
  // New Tournament Logic State with localStorage persistence
  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentConfig');
      return saved ? JSON.parse(saved) : {
        name: "", 
        numTeams: 10,
        iconsPerTeam: 3,
        baseBudget: 10000,
        defaultBasePrice: 100,
        squadSize: 15,
        auctionSlots: 120
      };
    }
    return {
      name: "", 
      numTeams: 10,
      iconsPerTeam: 3,
      baseBudget: 10000,
      defaultBasePrice: 100,
      squadSize: 15,
      auctionSlots: 120
    };
  })
  
  const [teams, setTeams] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentTeams');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })
  
  const [players, setPlayers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentPlayers');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })
  
  const [iconPlayers, setIconPlayers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentIconPlayers');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  })

  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentStep');
      return saved ? parseInt(saved) : 1;
    }
    return 1;
  })

  const [showCreateForm, setShowCreateForm] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tournamentShowCreateForm');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  })

  // Redirect non-admin users (but only after session is loaded)
  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    
    setIsSessionReady(true); // Mark session as ready
    
    if (!session || session.user?.role !== "admin") {
      router.push("/auctions")
      return
    }
  }, [session, status, router])

  // Restore state from localStorage after session is confirmed
  useEffect(() => {
    if (!isSessionReady || !session) return; // Wait for session to be ready
    
    // Only restore if user is admin
    if (session.user?.role === "admin") {
      const savedStep = localStorage.getItem('tournamentStep');
      const savedShowCreateForm = localStorage.getItem('tournamentShowCreateForm');
      
      if (savedStep) {
        setStep(parseInt(savedStep));
      }
      if (savedShowCreateForm) {
        setShowCreateForm(JSON.parse(savedShowCreateForm));
      }
    }
  }, [isSessionReady, session])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentConfig', JSON.stringify(config));
    }
  }, [config])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentTeams', JSON.stringify(teams));
    }
  }, [teams])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentPlayers', JSON.stringify(players));
    }
  }, [players])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentIconPlayers', JSON.stringify(iconPlayers));
    }
  }, [iconPlayers])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentStep', step.toString());
    }
  }, [step])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tournamentShowCreateForm', JSON.stringify(showCreateForm));
    }
  }, [showCreateForm])

  // Reset functions for individual steps
  const resetTeams = () => {
    const resetTeamsData = teams.map((team, index) => ({
      ...team,
      name: "",
      logoUrl: ""
    }));
    setTeams(resetTeamsData);
    setErrors(prev => ({ ...prev, teams: [] }));
  };

  const resetIcons = () => {
    const resetIconsData = iconPlayers.map((icon) => ({
      ...icon,
      name: "",
      role: "All-Rounder",
      village: "",
      age: "",
      imageUrl: ""
    }));
    setIconPlayers(resetIconsData);
    setErrors(prev => ({ ...prev, icons: [] }));
  };

  // Full reset function
  const resetTournament = () => {
    setConfig({ 
      name: "", 
      numTeams: 10,
      iconsPerTeam: 3,
      baseBudget: 10000,
      defaultBasePrice: 100,
      squadSize: 15,
      auctionSlots: 120
    });
    setTeams([]);
    setPlayers([]);
    setIconPlayers([]);
    setStep(1);
    setErrors({});
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tournamentConfig');
      localStorage.removeItem('tournamentTeams');
      localStorage.removeItem('tournamentPlayers');
      localStorage.removeItem('tournamentIconPlayers');
      localStorage.removeItem('tournamentStep');
      localStorage.removeItem('tournamentShowCreateForm');
    }
  };

  // Fetch tournaments data
  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`)
      .then(res => res.ok ? res.json() : Promise.reject("Offline"))
      .then(data => {
        setPastTournaments(data)
        setBackendError(false)
      })
      .catch(err => {
        console.error("Dashboard fetch error:", err)
        setBackendError(true)
      })
  }

  if (status === "loading" || !isSessionReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">Loading Auction Dashboard...</div>
          <div className="text-slate-400 text-sm">Restoring your tournament data</div>
        </div>
      </div>
    )
  }

  if (!session || session.user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-6">This area is restricted to administrators only.</p>
          <Link 
            href="/auctions" 
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            View Live Auctions
          </Link>
        </div>
      </div>
    )
  }

  const STEP_TOTAL = 5;

  // Robust Excel Mapping Helper
  const fixUrl = (url) => {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.+?)\//);
    if (match?.[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    const idParam = new URLSearchParams(url.split("?")[1]).get("id");
    if (idParam) return `https://drive.google.com/uc?export=view&id=${idParam}`;
  }
  return url;
};

const hasNonEng = (s) => /[^\x00-\x7F]/.test(s);

function findValue(row, keys) {
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
    if (found) return row[found];
  }
  for (const k of keys) {
    const found = rowKeys.find(rk => rk.toLowerCase().includes(k.toLowerCase()) && !rk.toLowerCase().includes("team"));
    if (found) return row[found];
  }
  return null;
}

  const handleTeamsUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target.result
      try {
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const imported = rows.map((row, index) => ({
          name: findValue(row, ["teamName", "team name", "name", "team"]) || `Team ${index + 1}`,
          shortName: findValue(row, ["shortName", "short name", "code", "id"]) || "TBD",
          logoUrl: findValue(row, ["logoUrl", "logo", "image", "logo link", "link"]) || "/teams/default-logo.png",
          color: ["bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-red-600", "bg-violet-600", "bg-yellow-600"][index % 6]
        }))
        setTeams(imported)
        if (imported.length > 0) {
          setConfig(prev => ({ ...prev, numTeams: imported.length }))
          setErrors(prev => ({ ...prev, numTeams: "" }))
        }
      } catch (err) {
        alert("Invalid file format. Please check your Excel or CSV structure.")
      }
    }
    reader.readAsBinaryString(file)
    
    // Reset the file input to allow uploading the same file again
    e.target.value = ''
  }

  const handleIconsUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target.result
      try {
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const imported = rows.map((row, index) => ({
          name: findValue(row, ["player name", "playerName", "icon", "name"]) || "",
          role: findValue(row, ["role", "type", "position"]) || "All-Rounder",
          age: Number(findValue(row, ["age", "years"])) || 0,
          village: findValue(row, ["village", "town"]) || "-",
          imageUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url"]) || "",
          teamMatch: findValue(row, ["team", "teamName", "team name"]),
          teamLogo: findValue(row, ["logo", "team logo", "logo link"])
        })).filter(p => p.name && p.teamMatch);

        const newIcons = [...iconPlayers];
        const newTeams = [...teams];

        imported.forEach(imp => {
          const tIdx = newTeams.findIndex(t => t.name.toLowerCase().includes(imp.teamMatch.toLowerCase()));
          if (tIdx !== -1) {
            // Update team logo if provided
            if (imp.teamLogo) {
              newTeams[tIdx].logoUrl = imp.teamLogo;
            }
            
            // Assign icon player to slot
            const firstEmpty = newIcons.findIndex(p => p.teamIdx === tIdx && !p.name);
            if (firstEmpty !== -1) {
              newIcons[firstEmpty] = { ...newIcons[firstEmpty], ...imp, team: newTeams[tIdx].name };
            }
          }
        });
        setTeams(newTeams);
        setIconPlayers(newIcons);
      } catch (err) {
        alert("Invalid icon player file format. Supports .xlsx, .xls, and .csv")
      }
    }
    reader.readAsBinaryString(file)
    
    // Reset the file input to allow uploading the same file again
    e.target.value = ''
  }

  const handlePlayersUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target.result
      try {
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)
        const imported = rows.map((row, i) => ({
          id: i + 1,
          name:         findValue(row, ["player name", "playerName", "name", "player", "ಆಟಗಾರನ ಹೆಸರು"]) || "PLAYER NAME",
          role:         findValue(row, ["role", "type", "position", "ಪಾತ್ರ"]) || "All-Rounder",
          age:          Number(findValue(row, ["age", "years", "ವಯಸ್ಸು"])) || 0,
          dob:          findValue(row, ["dob", "date of birth", "birth", "ಹುಟ್ಟಿದ ದಿನಾಂಕ"]) || "",
          battingStyle: findValue(row, ["batting", "battingStyle", "style", "ಬ್ಯಾಟಿಂಗ್"]) || "Right Hand",
          bowlingStyle: findValue(row, ["bowling", "bowlingStyle", "ಬೌಲಿಂಗ್"]) || "-",
          village:      findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
          basePrice:    Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || config.defaultBasePrice,
          imageUrl:     fixUrl(findValue(row, ["imageUrl", "photo", "image", "link", "url", "ಭಾವಚಿತ್ರ"])) || "",
          status:       "available",
        }));
        setPlayers(imported);

        // Process Drive URLs via Proxy to S3
        const API = process.env.NEXT_PUBLIC_API_URL;
        imported.forEach((p, idx) => {
          if (p.imageUrl && p.imageUrl.includes("drive.google.com")) {
            fetch(`${API}/api/upload/proxy-url`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: p.imageUrl, folder: "players" })
            })
            .then(r => r.json())
            .then(data => {
              if (data.s3Url) {
                setPlayers(prev => {
                  const next = [...prev];
                  if (next[idx]) next[idx].imageUrl = data.s3Url;
                  return next;
                });
              }
            });
          }
        });
      } catch (err) {
        alert("Invalid player file format. Supports .xlsx, .xls, and .csv")
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImageUpload = async (e, callback, folder = "teams") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const url = await uploadToS3(file, folder);
      callback(url);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const startAuction = async () => {
    if (players.length === 0) return alert("Please upload players first")

    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          teams: teams,
          players: [
            ...iconPlayers.map(p => ({ ...p, isIcon: true, status: "sold", soldPrice: 0 })),
            ...players
          ]
        })
      })
      const data = await res.json()
      if (data.tournamentId) {
        router.push(`/live-auction?id=${data.tournamentId}`)
      }
    } catch (err) {
      alert("Error starting auction. Ensure the backend server is running on port 5000.")
    } finally {
      setLoading(false)
    }
  }

  const validateStep1 = () => {
    const newErrors = {};
    if (!config.name.trim()) newErrors.name = "Required";
    if (!config.numTeams || config.numTeams < 2) newErrors.numTeams = "Min 2 teams";
    if (!config.iconsPerTeam || config.iconsPerTeam < 0) newErrors.iconsPerTeam = "Required";
    if (config.baseBudget === "" || config.baseBudget < 0) newErrors.baseBudget = "Required";
    if (config.defaultBasePrice === "" || config.defaultBasePrice < 0) newErrors.defaultBasePrice = "Required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const validateStep2 = () => {
    const teamErrors = teams.map(t => ({
      name: !t.name.trim(),
      shortName: !t.shortName.trim()
    }));
    
    setErrors({ teams: teamErrors });
    return !teamErrors.some(e => e.name || e.shortName);
  }

  const validateStep3 = () => {
    const iconErrors = iconPlayers.map(p => ({
      name: !p.name.trim()
    }));
    
    setErrors({ icons: iconErrors });
    return !iconErrors.some(e => e.name);
  }

  const nextStep = () => {
    if (step === 1) {
      if (validateStep1()) {
        if (teams.length !== Number(config.numTeams)) {
          const newTeams = Array.from({ length: Number(config.numTeams) }, (_, i) => ({
            name: teams[i]?.name || `Team ${i + 1}`,
            shortName: teams[i]?.shortName || `T${i + 1}`,
            logoUrl: teams[i]?.logoUrl || "",
            color: ["bg-blue-600", "bg-purple-600", "bg-orange-600", "bg-red-600", "bg-violet-600", "bg-yellow-600"][i % 6]
          }));
          setTeams(newTeams);
        }
        setStep(2);
      } else {
        alert("Please fill all required tournament details (marked in red).");
      }
    } else if (step === 2) {
      if (validateStep2()) {
        const totalIcons = config.numTeams * config.iconsPerTeam;
        if (iconPlayers.length !== totalIcons) {
          const newIcons = [];
          teams.forEach((team, teamIdx) => {
            for (let i = 0; i < config.iconsPerTeam; i++) {
              newIcons.push({
                name: "", role: "All-Rounder", village: "", age: "", team: team.name, teamIdx: teamIdx, imageUrl: ""
              });
            }
          });
          setIconPlayers(newIcons);
        } else {
          const syncedIcons = iconPlayers.map(icon => ({
            ...icon,
            team: teams[icon.teamIdx]?.name || icon.team
          }));
          setIconPlayers(syncedIcons);
        }
        setStep(3);
      } else {
        alert("Please provide names and codes for all teams.");
      }
    } else if (step === 3) {
      if (validateStep3()) {
        setStep(4);
      } else {
        alert("Please provide names for all assigned Icon Players.");
      }
    } else if (step === 4) {
    } else if (step === 5) {
      if (players.length === 0) return alert("Please upload the auction players Excel file first.");
      setStep(6);
    }
  }
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-violet-500/30">
      {/* Back Button */}
      <div className="sticky top-4 z-50 flex justify-start">
        <Link href="/" className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-violet-500 whitespace-nowrap backdrop-blur-md min-h-[40px] flex items-center shadow-lg m-4">
          ← Back to Home
        </Link>
      </div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-violet-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-2xl">🏆</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Auctions</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Management Dashboard</p>
            </div>
          </div>
          
          {!showCreateForm && (
            <button 
              onClick={() => {
                setShowCreateForm(true)
                setStep(1)
                setErrors({})
                setConfig({ 
                  name: "", 
                  numTeams: 10,
                  iconsPerTeam: 3,
                  baseBudget: 10000,
                  defaultBasePrice: 100,
                  squadSize: 11
                })
                setTeams([])
                setPlayers([])
                setIconPlayers([])
              }}
              className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-95 flex items-center gap-2"
            >
              <span>+</span> NEW TOURNAMENT
            </button>
          )}
        </header>

        {backendError && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-4 animate-pulse">
            <span className="text-xl">⚠️</span>
            <p className="text-red-400 text-sm font-semibold">Backend Offline. Check your server connection.</p>
          </div>
        )}

        {!showCreateForm ? (
          <main>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTournaments.length > 0 ? (
                pastTournaments.map(t => (
                  <div key={t._id} className="group relative bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-violet-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                      <span className="text-4xl opacity-20">🏆</span>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`w-2 h-2 rounded-full ${t.status === 'active' ? 'bg-violet-500' : 'bg-slate-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t.status}</span>
                      </div>
                      <h3 className="text-xl font-black mb-1 truncate uppercase group-hover:text-violet-400 transition-colors">{t.name}</h3>
                      <p className="text-slate-500 text-xs font-bold mb-6">CREATED: {new Date(t.createdAt).toLocaleDateString()}</p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-col">
                          <span className="text-slate-400 text-[10px] font-bold uppercase">Teams</span>
                          <span className="text-lg font-black text-white">{t.numTeams}</span>
                        </div>
                        <Link 
                          href={`/live-auction?id=${t._id}`}
                          className="bg-slate-700 hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95"
                        >
                          ENTER ARENA →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 bg-slate-800/20 border-2 border-dashed border-slate-700 rounded-[3rem] text-center">
                  <div className="text-6xl mb-4 opacity-20">🏟️</div>
                  <h3 className="text-xl font-bold text-slate-400">No Tournaments Found</h3>
                  <p className="text-slate-500 text-sm mt-2">Start by creating your first auction league.</p>
                </div>
              )}
            </div>
          </main>
        ) : (
          <main className="max-w-4xl mx-auto">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-12 relative px-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
                style={{ width: `${((step - 1) / (STEP_TOTAL - 1)) * 100}%` }}
              />
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all duration-300 text-xs
                    ${step > s ? 'bg-violet-500 shadow-lg shadow-violet-500/20' : 
                      step === s ? 'bg-white text-slate-900 shadow-xl shadow-white/10 scale-110' : 
                      'bg-slate-800 text-slate-500 border border-slate-700'}
                  `}>
                    {step > s ? <span className="text-base">✓</span> : s}
                  </div>
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl">
              
              {/* Step 1: Tournament Setup */}
              {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">1. Tournament Information</h2>
                      <p className="text-slate-400 text-sm">Define the core parameters of your tournament.</p>
                    </div>
                    <button
                      onClick={resetTournament}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                      🔄 Reset All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <div className="flex justify-between px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tournament Name</label>
                          {errors.name && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Required!</span>}
                       </div>
                       <input 
                         type="text" 
                         value={config.name} 
                         onChange={e => { setConfig({...config, name: e.target.value}); setErrors({...errors, name: ""}); }}
                         placeholder="IPL 2024 / Village League..."
                         className={`w-full bg-slate-900 border ${errors.name ? 'border-red-500' : 'border-slate-700'} rounded-2xl px-6 py-4 font-bold text-lg text-violet-400 outline-none focus:border-violet-500 transition-all`}
                       />
                    </div>
                    <div>
                       <div className="flex justify-between px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Number of Teams</label>
                          {errors.numTeams && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">{errors.numTeams}</span>}
                       </div>
                       <input 
                         type="number" 
                         value={config.numTeams} 
                         onChange={e => { setConfig({...config, numTeams: Number(e.target.value) || 0}); setErrors({...errors, numTeams: ""}); }}
                         className={`w-full bg-slate-900 border ${errors.numTeams ? 'border-red-500' : 'border-slate-700'} rounded-2xl px-6 py-4 font-bold outline-none focus:border-violet-500 transition-all`}
                       />
                    </div>
                    <div>
                        <div className="flex justify-between px-1">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Icons per Team</label>
                           {errors.iconsPerTeam && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Required!</span>}
                        </div>
                        <input 
                          type="number" 
                          value={config.iconsPerTeam} 
                          onChange={e => { setConfig({...config, iconsPerTeam: Number(e.target.value) || 0}); setErrors({...errors, iconsPerTeam: ""}); }}
                          className={`w-full bg-slate-900 border ${errors.iconsPerTeam ? 'border-red-500' : 'border-slate-700'} rounded-2xl px-6 py-4 font-bold outline-none focus:border-violet-500 transition-all`}
                        />
                     </div>
                    <div>
                       <div className="flex justify-between px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Team Budget (₹)</label>
                          {errors.baseBudget && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Required!</span>}
                       </div>
                       <input 
                         type="number" 
                         value={config.baseBudget} 
                         onChange={e => { setConfig({...config, baseBudget: Number(e.target.value) || 0}); setErrors({...errors, baseBudget: ""}); }}
                         className={`w-full bg-slate-900 border ${errors.baseBudget ? 'border-red-500' : 'border-slate-700'} rounded-2xl px-6 py-4 font-bold text-yellow-500 outline-none focus:border-violet-500 transition-all`}
                       />
                    </div>
                    <div>
                       <div className="flex justify-between px-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Default Base Price (₹)</label>
                          {errors.defaultBasePrice && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">Required!</span>}
                       </div>
                       <input 
                         type="number" 
                         value={config.defaultBasePrice} 
                         onChange={e => { setConfig({...config, defaultBasePrice: Number(e.target.value) || 0}); setErrors({...errors, defaultBasePrice: ""}); }}
                         className={`w-full bg-slate-900 border ${errors.defaultBasePrice ? 'border-red-500' : 'border-slate-700'} rounded-2xl px-6 py-4 font-bold text-white outline-none focus:border-violet-500 transition-all`}
                       />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Teams */}
              {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">2. Teams Setup</h2>
                      <div className="flex justify-center gap-4 mb-6">
                        <p className="text-slate-400 text-sm">Configure your {config.numTeams} teams.</p>
                        <label className="cursor-pointer bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-violet-400 transition-all flex items-center gap-2">
                          <span>Bulk Upload Teams</span>
                          <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleTeamsUpload} />
                          <span>📥</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={resetTeams}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                      🔄 Reset Teams
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto px-2 custom-scrollbar pr-4">
                    {teams.map((team, idx) => (
                      <div key={idx} className={`bg-slate-900/60 border ${errors.teams?.[idx]?.name || errors.teams?.[idx]?.shortName ? 'border-red-500/50 shadow-lg shadow-red-500/5' : 'border-slate-700'} rounded-3xl p-6 flex items-center gap-6 group hover:border-violet-500/30 transition-all`}>
                        <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          <img src={team.logoUrl || `https://ui-avatars.com/api/?name=${team.name || (idx + 1)}&background=random`} alt="logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <input 
                            placeholder="Team Name"
                            value={team.name}
                            onChange={(e) => {
                              const nt = [...teams];
                              nt[idx].name = e.target.value;
                              setTeams(nt);
                              setErrors(prev => ({ 
                                ...prev, 
                                teams: prev.teams?.map((te, i) => i === idx ? { ...te, name: false } : te) 
                              }));
                            }}
                            className={`w-full bg-transparent border-b ${errors.teams?.[idx]?.name ? 'border-red-500' : 'border-slate-700'} py-1 font-black text-white focus:border-violet-500 outline-none placeholder:text-slate-600`}
                          />
                          <div className="flex items-center gap-2">
                             <label className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-[10px] font-bold cursor-pointer hover:border-violet-500 flex items-center justify-between transition-all">
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*" 
                                 onChange={(e) => handleImageUpload(e, (url) => {
                                   const nt = [...teams];
                                   nt[idx].logoUrl = url;
                                   setTeams(nt);
                                 })} 
                               />
                               <span className="text-slate-500">{team.logoUrl ? "Uploaded" : "Upload Logo"}</span>
                               <span className="text-violet-500">{team.logoUrl ? "🔄" : "📸"}</span>
                             </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Icon Players */}
              {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">3. Icon Players</h2>
                      <div className="flex justify-center gap-4 mb-6">
                        <p className="text-slate-400 text-sm">Assign icons to each team.</p>
                        <label className="cursor-pointer bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all flex items-center gap-2">
                          <span>Bulk Upload Icons</span>
                          <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleIconsUpload} />
                          <span>📥</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={resetIcons}
                      className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                    >
                      🔄 Reset Icons
                    </button>
                  </div>

                  <div className="space-y-12 max-h-[500px] overflow-y-auto px-4 custom-scrollbar pr-6">
                    {teams.map((team, tIdx) => (
                      <div key={tIdx} className="space-y-4">
                        <div className="flex items-center gap-3 border-l-4 border-violet-500 pl-4 py-1">
                          <h3 className="font-black uppercase tracking-widest text-violet-400">{team.name} Icons</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {iconPlayers.map((icon, fullIdx) => {
                            if (icon.teamIdx !== tIdx) return null;
                            const iconInTeamIdx = iconPlayers.filter((p, i) => p.teamIdx === tIdx && i < fullIdx).length;
                            const hasError = errors.icons?.[fullIdx]?.name;
                            
                            return (
                              <div key={fullIdx} className={`bg-slate-900 border ${hasError ? 'border-red-500' : 'border-slate-800'} rounded-3xl p-6 space-y-4`}>
                                <div className="flex justify-between items-center px-1">
                                   <p className="text-[10px] font-black text-slate-600 uppercase">ICON {iconInTeamIdx + 1}</p>
                                   {hasError && <span className="text-[8px] text-red-500 font-bold uppercase animate-pulse">Required!</span>}
                                </div>
                                
                                {/* Player Image Preview */}
                                <div className="flex justify-center">
                                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                    {icon.imageUrl ? (
                                      <img src={icon.imageUrl} alt="Player" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-slate-600 text-4xl">👤</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                     <input 
                                       placeholder="Player Name" 
                                       value={icon.name}
                                       onChange={(e) => {
                                         const ni = [...iconPlayers];
                                         ni[fullIdx].name = e.target.value;
                                         setIconPlayers(ni);
                                         setErrors(prev => ({ 
                                           ...prev, 
                                           icons: prev.icons?.map((er, i) => i === fullIdx ? { name: false } : er) 
                                         }));
                                       }}
                                       className={`w-full bg-slate-800 border ${hasError ? 'border-red-500' : 'border-slate-700'} rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-violet-500`}
                                     />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer hover:border-violet-500 flex items-center justify-between transition-all">
                                       <span className="text-slate-500">{icon.imageUrl ? 'REPLACE PHOTO' : 'UPLOAD PHOTO'}</span>
                                       <input 
                                         type="file" 
                                         className="hidden" 
                                         accept="image/*" 
                                         onChange={(e) => handleImageUpload(e, (url) => {
                                           const ni = [...iconPlayers];
                                           ni[fullIdx].imageUrl = url;
                                           setIconPlayers(ni);
                                         }, "players")} 
                                       />
                                       <span className="text-violet-500">📸</span>
                                    </label>
                                  </div>
                                  <input 
                                    placeholder="Role" 
                                    value={icon.role}
                                    onChange={(e) => {
                                      const ni = [...iconPlayers];
                                      ni[fullIdx].role = e.target.value;
                                      setIconPlayers(ni);
                                    }}
                                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-violet-500"
                                  />
                                  <input 
                                    placeholder="Village" 
                                    value={icon.village}
                                    onChange={(e) => {
                                      const ni = [...iconPlayers];
                                      ni[fullIdx].village = e.target.value;
                                      setIconPlayers(ni);
                                    }}
                                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-violet-500"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Upload Players */}
              {step === 4 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center">
                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">4. Auction Players Upload</h2>
                    <p className="text-slate-400 text-sm">Upload the pool of players available for bidding.</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="w-full max-w-xl group relative border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-[2rem] p-12 transition-all cursor-pointer bg-slate-900/20 hover:bg-violet-500/5 flex flex-col items-center gap-4">
                      <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handlePlayersUpload} />
                      <div className="w-16 h-16 bg-slate-800 group-hover:bg-violet-500/20 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                        📋
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg text-slate-200">Upload players (Excel or CSV)</p>
                        <p className="text-slate-500 text-xs mt-1 font-semibold uppercase tracking-wider">contains name, role, base price, village etc.</p>
                      </div>
                    </label>
                  </div>

                  {players.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                      <div className="grid grid-cols-[80px_1fr_1fr_80px_1fr_120px] px-6 py-4 bg-slate-800/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-700">
                        <span>Photo</span><span>Name</span><span>Role</span><span className="text-center">Age</span><span>Village</span><span className="text-right">Price</span>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-800 custom-scrollbar">
                        {players.map((p, idx) => (
                          <div key={idx} className="grid grid-cols-[80px_1fr_1fr_80px_1fr_120px] px-6 py-3 items-center hover:bg-white/[0.02] transition-colors gap-4">
                            {/* Photo Column */}
                            <label className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center cursor-pointer hover:border-violet-500/50 transition-all shrink-0 group">
                              {p.imageUrl && p.imageUrl !== "/players/default.png"
                                ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <div className="text-xl">📸</div>
                              }
                              <input type="file" className="hidden" accept="image/*"
                                onChange={e => handleImageUpload(e.target.files[0], url => {
                                  const np = [...players]; np[idx].imageUrl = url; setPlayers(np);
                                }, "players")} />
                            </label>

                            {/* Name Editable */}
                            <input value={p.name}
                              onChange={e => { const np = [...players]; np[idx].name = e.target.value; setPlayers(np); }}
                              className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-violet-500 text-sm font-bold outline-none w-full py-1 ${hasNonEng(p.name) ? 'text-red-500' : 'text-white'}`} />

                            {/* Role Editable */}
                            <select value={p.role}
                              onChange={e => { const np = [...players]; np[idx].role = e.target.value; setPlayers(np); }}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 focus:border-violet-500 outline-none w-full">
                              {["Batsman","Bowler","All-Rounder","Wicket Keeper","WK-Batsman"].map(v => <option key={v}>{v}</option>)}
                            </select>

                            {/* Age Editable */}
                            <input value={p.age}
                              onChange={e => { const np = [...players]; np[idx].age = e.target.value; setPlayers(np); }}
                              className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-violet-500 text-xs text-slate-400 font-semibold text-center outline-none w-full py-1" />

                            {/* Village Editable */}
                            <input value={p.village}
                              onChange={e => { const np = [...players]; np[idx].village = e.target.value; setPlayers(np); }}
                              className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-violet-500 text-xs text-slate-500 outline-none w-full py-1" />

                            {/* Price Editable */}
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-violet-500 text-xs font-bold">₹</span>
                              <input type="number" value={p.basePrice}
                                onChange={e => { const np = [...players]; np[idx].basePrice = Number(e.target.value); setPlayers(np); }}
                                className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-violet-500 text-xs text-violet-400 font-bold text-right outline-none w-20 py-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Review */}
              {step === 5 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center">
                    <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">5. Final Review</h2>
                    <p className="text-slate-400 text-sm">Review everything before launching the live auction.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-xl">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Tournament Detail</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-slate-500">Teams</span>
                              <span className="font-black text-white">{config.numTeams}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-xl">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Player Summary</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-slate-500">Icons Registered</span>
                              <span className="font-black text-violet-400">{iconPlayers.length}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-slate-500">Auction Pool</span>
                              <span className="font-black text-blue-400">{players.length} Players</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-800 pb-2">
                              <span className="text-slate-500">Total Database</span>
                              <span className="font-black text-white">{(iconPlayers.length + players.length) || 0}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500">Squad Requirement</span>
                              <span className="font-black text-white">{(config.squadSize || 0)} / Team</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="text-center p-8 bg-violet-500/5 rounded-[2rem] border border-violet-500/10">
                     <p className="text-lg font-bold text-slate-300">Ready to start the show?</p>
                     <p className="text-slate-500 text-xs mt-1">Once started, auction settings for this league are finalized.</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-12 pt-8 border-t border-white/5">
                <button 
                  onClick={step === 1 ? () => setShowCreateForm(false) : prevStep}
                  className="px-8 py-4 rounded-2xl font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  ← BACK
                </button>
                
                {step < STEP_TOTAL ? (
                  <button 
                    onClick={nextStep}
                    disabled={step === 1 && !config.name}
                    className="bg-white text-slate-900 hover:bg-violet-400 hover:text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-white/5 active:scale-[0.98] disabled:opacity-20 flex items-center gap-2"
                  >
                    CONTINUE →
                  </button>
                ) : (
                  <button 
                    onClick={startAuction}
                    disabled={loading || players.length === 0}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? "INITIALIZING..." : "START AUCTION 🏟️"}
                  </button>
                )}
              </div>
            </div>

            {/* Hint */}
            <p className="text-center mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
              {step === 1 && "Start by naming your tournament"}
              {step === 2 && "Teams are required for the auction pool"}
              {step === 3 && "Images will be automatically linked if URLs match"}
            </p>
          </main>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation-duration: 0.5s;
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fade-in;
        }
        .slide-in-from-bottom-4 {
          animation-name: slide-in-from-bottom-4;
        }
      `}</style>
    </div>
  )
}

