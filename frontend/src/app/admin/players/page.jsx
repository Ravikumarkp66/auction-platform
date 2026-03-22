"use client";

import { useState, useEffect } from "react";
import { User, Search, Plus, Filter, AlertTriangle, ShieldCheck, Check, X, AlertCircle, Hash, Trophy, MousePointer2, Edit3, FileSpreadsheet, RefreshCw, Download, Shuffle } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { uploadToS3 } from "../../../lib/uploadToS3";

let socket;

export default function PlayersRegistry() {
  const { selectedAuction } = useAuction();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, SOLD, UNSOLD, AVAILABLE

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Form States
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({});
  const [newPlayer, setNewPlayer] = useState({ 
    name: "", 
    role: "All-Rounder", 
    basePrice: 100, 
    isIcon: false, 
    status: "available", 
    teamId: "",
    age: 20,
    village: "",
    mobile: "",
    battingStyle: "Right Hand Bat",
    bowlingStyle: "Right arm fast",
    photo: null
  });
  const [isImporting, setIsImporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, type }
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchData();
      socket = io(process.env.NEXT_PUBLIC_API_URL);
    } else {
      setLoading(false);
    }
    return () => socket?.disconnect();
  }, [selectedAuction]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === "ALL" ? "ALL" : activeTab.toLowerCase();
      const [pRes, tRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players?tournamentId=${selectedAuction._id}&status=${statusParam}&isIcon=false`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();
      setPlayers(pData);
      setTeams(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleAddPlayer = async () => {
    if (!newPlayer.name) return alert("Please enter player name");
    
    setLoading(true);
    try {
       // 1. Upload Photo if selected
       let photoUrl = "";
       if (newPlayer.photo) {
         photoUrl = await uploadToS3(newPlayer.photo, "players");
       }

       // 2. Save Player
       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ 
           ...newPlayer, 
           tournamentId: selectedAuction._id,
           imageUrl: photoUrl,
           photo: { s3: photoUrl } 
         })
       });
       
       if (res.ok) {
         const addedP = await res.json();
         alert(`Athlete ${addedP.name} added successfully with ID ${addedP.applicationId}`);
         setIsAddModalOpen(false);
         setNewPlayer({ 
            name: "", role: "All-Rounder", basePrice: 100, isIcon: false, status: "available", teamId: "",
            age: 20, village: "", mobile: "", battingStyle: "Right Hand Bat", bowlingStyle: "Right arm fast", photo: null
         });
         fetchData();
         socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
       } else {
         const err = await res.json();
         alert(`Failed to add: ${err.message}`);
       }
    } catch (err) { 
      console.error(err);
      alert("Error adding athlete: " + err.message); 
    } finally {
      setLoading(false);
    }
  };

  const openManageModal = (p) => {
    setEditingPlayer(p);
    setFormData({
      name: p.name,
      role: p.role,
      status: p.status,
      basePrice: p.basePrice || 0,
      soldPrice: p.soldPrice || 0,
      team: p.team?._id || p.team || "",
      isIcon: p.isIcon || false
    });
    setIsManageModalOpen(true);
  };

  const handleImportPlayers = async (e) => {
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

            const players = data.map(row => ({
                name: findValue(row, ["player name", "playerName", "name", "player", "ಆಟಗಾರನ ಹೆಸರು"]) || "PLAYER NAME",
                role: findValue(row, ["playing role", "role", "skill", "player role", "category", "type", "position", "ಪಾತ್ರ", "ಸ್ಥಾನ"]) || "All-Rounder",
                mobile: findValue(row, ["mobile", "phone", "contact", "ಮೊಬೈಲ್", "ದೂರವಾಣಿ"]) || "-",
                battingStyle: findValue(row, ["batting", "battingStyle", "style", "ಬ್ಯಾಟಿಂಗ್"]) || "Right Hand",
                bowlingStyle: findValue(row, ["bowling", "bowlingStyle", "ಬೌಲಿಂಗ್"]) || "-",
                village: findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
                basePrice: Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || 100,
                imageUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url", "ಭಾವಚಿತ್ರ"]) || ""
            }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players, tournamentId: selectedAuction._id })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Successfully added ${result.added} new athletes! (Skipped ${result.skipped} duplicates)`);
                fetchData();
            } else {
                alert("Failed to import athletes");
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


  const handleFinalConfirm = async () => {
    if (confirmText !== "CONFIRM") return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editingPlayer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
        setIsConfirmModalOpen(false);
        setConfirmText("");
        fetchData();
      }
    } catch (err) { alert("Update failed"); }
  };

  const handleDeletePlayer = async (id) => {
    if (!confirm("Are you sure you want to delete this athlete? The list will be re-indexed automatically.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Athlete deleted and list re-indexed!");
        fetchData();
      }
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleJumble = async () => {
    if (!confirm("Shuffle all athlete application IDs randomly? This will change the auction sequence.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/jumble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: selectedAuction._id })
      });
      if (res.ok) {
        alert("Auction sequence jumbled successfully!");
        fetchData();
      }
    } catch (err) { alert("Jumble failed"); }
  };

  const handleRevertOrder = async () => {
    if (!confirm("Restore the original auction order from CSV?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/revert-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: selectedAuction._id })
      });
      if (res.ok) {
        alert("Original auction order restored!");
        fetchData();
      }
    } catch (err) { alert("Revert failed"); }
  };

  const getBase64FromUrl = async (url) => {
    try {
      // Use proxy to avoid CORS issues with S3/Drive
      const proxyUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return null;
      const blob = await res.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Base64 conversion failed:", err);
      return null;
    }
  };

  const compressImage = (base64, quality = 0.95) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 500; // Increased resolution for better clarity
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
    });
  };

  const downloadPlayersPDF = async () => {
    if (!filtered || filtered.length === 0) {
      alert("No athletes found for the current search/filter.");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      // 0. Fetch LATEST tournament details (to get organizerLogo if just updated)
      let currentAuction = selectedAuction;
      try {
        const tRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${selectedAuction._id}`);
        if (tRes.ok) {
          const tData = await tRes.json();
          if (tData.tournament) currentAuction = tData.tournament;
        }
      } catch (err) {
        console.warn("Could not refresh tournament data for PDF", err);
      }

      const doc = new jsPDF();
      const tournamentName = currentAuction?.name || "Tournament";
      const orgLogoUrl = currentAuction?.organizerLogo;

      // Top Left Organizer Logo (Try to fetch and add)
      if (orgLogoUrl) {
        try {
          const b64 = await getBase64FromUrl(orgLogoUrl);
          if (b64) {
            doc.addImage(b64, "PNG", 14, 10, 22, 22);
          }
        } catch (e) {
          console.warn("Org Logo image data failed", e);
        }
      }

      // 1. Header & Branding (Centered)
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFont(undefined, "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); 
      doc.text("PARMESHWAR CUP - 2026", pageWidth / 2, 18, { align: "center" });
      
      doc.setFont(undefined, "normal");
      doc.setFontSize(12);
      doc.setTextColor(10, 10, 10);
      doc.text("Registered Players List!", pageWidth / 2, 26, { align: "center" });
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); 
      doc.text(`Official Record: ${tournamentName}`, pageWidth / 2, 33, { align: "center" });
      doc.text(`Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 38, { align: "center" });

      // Title line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 42, pageWidth - 14, 42);

      // STEP 1 — Prepare Compressed Data Objects
      const rawData = await Promise.all(
        [...filtered].sort((a,b) => (a.applicationId || 0) - (b.applicationId || 0)).map(async (p, i) => {
          const imgUrl = p.imageUrl || p.image;
          let imgData = null;
          
          if (imgUrl) {
             const base64 = await getBase64FromUrl(imgUrl);
             if (base64) {
                imgData = await compressImage(base64); 
             }
          }
          
          return {
            id: String(p.applicationId || i + 1),
            image: imgData,
            name: p.name || "N/A",
            contact: String(p.mobile || p.phone || p.contactNumber || "-"),
            role: String(p.role || "-"),
            village: String(p.village || "-")
          };
        })
      );

      // STEP 2 — Build AutoTable (Final Stability Config)
      autoTable(doc, {
        theme: "grid", // 🔥 Extra Stability & Alignment
        columns: [
          { header: "Sl No", dataKey: "id" },
          { header: "Image", dataKey: "image" },
          { header: "Player Name", dataKey: "name" },
          { header: "Contact", dataKey: "contact" },
          { header: "Role", dataKey: "role" },
          { header: "Village", dataKey: "village" }
        ],
        body: rawData,
        startY: 48,
        margin: { top: 45, bottom: 25 }, // 🔥 Balanced for centered header & footer
        rowPageBreak: "avoid", // 🔥 Prevents splitting a single athlete across two pages
        
        styles: {
          fontSize: 8.5, 
          valign: "middle",
          minCellHeight: 28, // 🔥 High-end Padding (Matches imgSize 18 + padding)
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [16, 160, 120], 
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          fontSize: 10
        },
        columnStyles: {
          id: { cellWidth: 12, halign: "center" },
          image: { cellWidth: 26 }, 
          name: { cellWidth: 40, fontStyle: "bold" },
          contact: { cellWidth: 30 },
          role: { cellWidth: 32 }, 
          village: { cellWidth: 40 }
        },
        didParseCell: (data) => {
          if (data.column.dataKey === "image" && data.section === "body") {
            data.cell.text = ""; 
          }
        },
        didDrawCell: (dataCell) => {
          // STEP 3 — MANUALLY DRAW CENTERED IMAGES (Optimized for 28 height)
          if (dataCell.column.dataKey === "image" && dataCell.row.section === "body") {
            const item = dataCell.row.raw;
            if (item?.image) {
              const imgSize = 18; 
              
              // Perfectly center inside the now taller cells
              const x = dataCell.cell.x + (dataCell.cell.width - imgSize) / 2;
              const y = dataCell.cell.y + (dataCell.cell.height - imgSize) / 2;

              try {
                // Use JPEG with high quality
                doc.addImage(item.image, "JPEG", x, y, imgSize, imgSize, undefined, "SLOW");
                doc.setDrawColor(226, 232, 240);
                doc.rect(x, y, imgSize, imgSize);
              } catch (e) {
                console.warn("Image skipped", e);
              }
            }
          }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] 
        },
        didDrawPage: (data) => {
           const str = "Page " + doc.internal.getNumberOfPages();
           doc.setFontSize(8);
           doc.setTextColor(150);
           doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
           doc.text("Designed by Ravikumar K P", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
        }
      });

      doc.save(`${tournamentName.replace(/\s+/g, '_')}_Registry.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const filtered = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!selectedAuction) return <div className="p-20 text-center text-slate-500">Select context...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Athlete <span className="text-violet-500">Registry</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[.3em] mt-1">Auction System v2.0</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                placeholder="Search database..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 font-bold text-white focus:border-violet-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>


           
           <button 
             onClick={downloadPlayersPDF}
             disabled={isDownloadingPdf}
             className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-violet-500/50 transition-all flex items-center gap-2 shadow-xl shadow-black/20 disabled:opacity-50"
           >
             {isDownloadingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             {isDownloadingPdf ? "Compiling PDF..." : "Download PDF"}
           </button>

            <label className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-violet-500/50 transition-all flex items-center gap-2 cursor-pointer shadow-xl shadow-black/20">
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {isImporting ? "Processing..." : "Import Sheet"}
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportPlayers} disabled={isImporting} />
            </label>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all flex items-center gap-2"
           >
             <Plus className="w-4 h-4" /> Add Athlete
           </button>

           <div className="flex items-center gap-2 ml-2">
              <button 
                onClick={handleJumble}
                className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-2xl hover:bg-cyan-500/20 transition-all active:scale-95 shadow-xl"
                title="Jumble Sequence"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRevertOrder}
                className="p-3 bg-white/5 text-slate-400 border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 shadow-xl"
                title="Revert to Original Order"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
        {["ALL", "AVAILABLE", "SOLD", "UNSOLD"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── DATA TABLE ── */}
      <div className="bg-[#111827]/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Sl No (ID)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Athlete</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Price</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Node</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Slot</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.sort((a, b) => (a.applicationId || 0) - (b.applicationId || 0)).map((p) => (
                <tr key={p._id} className="group hover:bg-white/[0.03] transition-all">
                  <td className="px-8 py-4">
                     <span className="text-sm font-black text-violet-400 bg-violet-500/10 px-3 py-1 rounded-xl border border-violet-500/10">
                        {p.applicationId || "—"}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div 
                         onClick={() => setEditImageTarget({ id: p._id, url: p.imageUrl, name: p.name })}
                         className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-slate-800 flex items-center justify-center font-black text-white cursor-pointer hover:border-violet-500/50 transition-all group/img"
                       >
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-600" />}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Edit3 className="w-3 h-3 text-white" />
                          </div>
                       </div>
                       <div>
                          <p className="text-sm font-black text-white leading-tight">{p.name}</p>
                          {p.isIcon && <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter flex items-center gap-0.5"><Trophy className="w-2 h-2" /> ICON</span>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">{p.role}</td>
                  <td className="px-6 py-4">
                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        p.status === 'sold' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                        p.status === 'unsold' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
                     }`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-sm">{p.status === 'sold' ? `₹${p.soldPrice?.toLocaleString()}` : <span className="text-slate-700 italic">₹{p.basePrice}</span>}</td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-black uppercase text-slate-400 truncate max-w-[100px] block">
                        {p.team?.name || "—"}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     {p.teamSlotId ? (
                        <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                           {p.teamSlotId}
                        </span>
                     ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openManageModal(p)} className="p-2 bg-white/5 hover:bg-violet-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Manage"><MousePointer2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeletePlayer(p._id)} className="p-2 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all" title="Delete"><X className="w-4 h-4" /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest">Archive Empty</div>}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                 <h2 className="text-xl font-black text-white">Manual <span className="text-violet-500">Athlete Entry</span></h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                          <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} placeholder="Athlete Name" />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Age</label>
                             <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.age} onChange={e => setNewPlayer({...newPlayer, age: parseInt(e.target.value)})} />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mobile</label>
                             <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.mobile} onChange={e => setNewPlayer({...newPlayer, mobile: e.target.value})} placeholder="Contact No" />
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Village/Town</label>
                          <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.village} onChange={e => setNewPlayer({...newPlayer, village: e.target.value})} placeholder="Location" />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Playing Role</label>
                          <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500 cursor-pointer" value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value})}>
                             {["All-Rounder", "Batsman", "Bowler", "Wicketkeeper", "WK-Batsman"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                       </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batting Style</label>
                             <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500 cursor-pointer" value={newPlayer.battingStyle} onChange={e => setNewPlayer({...newPlayer, battingStyle: e.target.value})}>
                                <option value="Right Hand Bat">Right Hand Bat</option>
                                <option value="Left Hand Bat">Left Hand Bat</option>
                             </select>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Base Price (₹)</label>
                             <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.basePrice} onChange={e => setNewPlayer({...newPlayer, basePrice: parseInt(e.target.value)})} />
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bowling Style</label>
                          <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.bowlingStyle} onChange={e => setNewPlayer({...newPlayer, bowlingStyle: e.target.value})} placeholder="e.g. Right arm fast" />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Athlete Photo</label>
                          <div className="relative h-28 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center group hover:border-violet-500/50 transition-all">
                             {newPlayer.photo ? (
                                <div className="text-center">
                                   <p className="text-[10px] font-black text-emerald-500 uppercase">Selected: {newPlayer.photo.name}</p>
                                   <button type="button" onClick={() => setNewPlayer({...newPlayer, photo: null})} className="text-[8px] text-red-400 font-bold uppercase hover:underline mt-1">Remove</button>
                                </div>
                             ) : (
                                <>
                                   <Plus className="w-6 h-6 text-slate-600 group-hover:text-violet-500 transition-colors" />
                                   <p className="text-[10px] font-black text-slate-600 uppercase mt-1">Select Image</p>
                                </>
                             )}
                             <input type="file" accept="image/*" onChange={e => setNewPlayer({...newPlayer, photo: e.target.files[0]})} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                       </div>

                       <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                          <input type="checkbox" className="w-4 h-4 rounded border-white/10 accent-violet-500" checked={newPlayer.isIcon} onChange={e => setNewPlayer({...newPlayer, isIcon: e.target.checked})} id="icon-check" />
                          <label htmlFor="icon-check" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer">Mark as Icon Player</label>
                       </div>
                    </div>
                 </div>

                 {newPlayer.isIcon && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 border-t border-white/5 pt-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Team</label>
                       <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.teamId} onChange={e => setNewPlayer({...newPlayer, teamId: e.target.value})}>
                          <option value="">Select Team</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                       </select>
                    </div>
                 )}

                 <button 
                   onClick={handleAddPlayer} 
                   disabled={loading}
                   className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {loading ? "INITIALIZING..." : "UPLOAD & SAVE ATHLETE"}
                 </button>
              </div>
           </div>
        </div>
      )}


      {/* ── MANAGE/EDIT MODAL ── */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
           <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                 <h2 className="text-xl font-black text-white">System <span className="text-violet-500">Override</span></h2>
                 <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</label>
                    <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</label>
                    <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                       {["Batsman", "Bowler", "All-Rounder", "Wicket Keeper", "WK-Batsman"].map(r => <option key={r}>{r}</option>)}
                    </select></div>
                 </div>

                 <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Life Status</label>
                 <div className="flex gap-2">
                    {["available", "sold", "unsold"].map(s => (
                       <button key={s} onClick={() => setFormData({...formData, status: s})} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border transition-all ${formData.status === s ? 'bg-violet-600 border-violet-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>{s}</button>
                    ))}
                 </div></div>

                 {formData.status === 'sold' && (
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2">
                       <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sold Price (₹)</label>
                       <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.soldPrice} onChange={e => setFormData({...formData, soldPrice: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Winning Node</label>
                       <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})}>
                          <option value="">Select Team</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                       </select></div>
                    </div>
                 )}

                 <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 accent-violet-500" checked={formData.isIcon} onChange={e => setFormData({...formData, isIcon: e.target.checked})} id="icon-edit" />
                    <label htmlFor="icon-edit" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer">Icon Player Status</label>
                 </div>

                 <button onClick={() => { setIsManageModalOpen(false); setIsConfirmModalOpen(true); }} className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-violet-500/20 hover:scale-105 transition-all">Stage Override</button>
              </div>
           </div>
        </div>
      )}

      {/* ── SECURITY CONFIRMATION ── */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
           <div className="bg-[#0f172a] border border-red-500/20 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20"><AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" /></div>
                 <div><h3 className="text-xl font-black text-white">Manual Write?</h3><p className="text-xs text-slate-500 mt-2">You are modifying sensitive live data for <span className="text-white font-black">{editingPlayer.name}</span>.</p></div>
                 <div className="space-y-1.5 text-left"><label className="text-[9px] font-black uppercase tracking-widest text-slate-600">Type &quot;CONFIRM&quot; to proceed</label>
                 <input className="w-full bg-slate-900 border border-red-500/20 rounded-xl px-4 py-3 text-center text-sm font-black text-red-400 outline-none" placeholder="CONFIRM" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} /></div>
                 <div className="flex gap-2"><button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-600">Abort</button>
                 <button disabled={confirmText !== 'CONFIRM'} onClick={handleFinalConfirm} className="flex-1 py-3 bg-red-600 disabled:opacity-20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Commit</button></div>
              </div>
           </div>
        </div>
      )}

      {/* ── IMAGE EDIT MODAL ── */}
      {editImageTarget && (
        <ImageEditModal
          title={`Edit Photo: ${editImageTarget.name}`}
          initialImage={editImageTarget.url}
          onClose={() => setEditImageTarget(null)}
          onSave={async (file) => {
             // Handle photo update via S3 and PATCH
             try {
                // 1. Get upload URL
                const fileType = file.type;
                const { uploadUrl, fileUrl } = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`).then(r => r.json());
                
                // 2. Upload to S3
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                // 3. Update DB
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/players/${editImageTarget.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ imageUrl: fileUrl })
                });

                if (res.ok) {
                   socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
                   fetchData();
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
