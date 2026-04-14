"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Search, Plus, Filter, AlertTriangle, ShieldCheck, Check, X, AlertCircle, Hash, Trophy, MousePointer2, Edit3, FileSpreadsheet, RefreshCw, Download, Shuffle, Zap, ShieldAlert, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuction } from "../layout";
import { io } from "socket.io-client";
import ImageEditModal from "../../../components/ImageEditModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { uploadToS3 } from "../../../lib/uploadToS3";
import html2canvas from "html2canvas";
import { API_URL } from "../../../lib/apiConfig";

let socket;

export default function PlayersRegistry() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-slate-500 uppercase tracking-widest font-black animate-pulse">Initializing Registry...</div>}>
      <PlayersRegistryContent />
    </Suspense>
  );
}

function PlayersRegistryContent() {
  const { selectedAuction } = useAuction();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, SOLD, UNSOLD, AVAILABLE

  useEffect(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (["ALL", "SOLD", "UNSOLD", "AVAILABLE", "PENDING"].includes(upper)) {
        setActiveTab(upper);
      }
    }
  }, [tabParam]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [activeMenuPlayer, setActiveMenuPlayer] = useState(null);
  const [historyPlayer, setHistoryPlayer] = useState(null);
  const [selectedVerifyPlayer, setSelectedVerifyPlayer] = useState(null);

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
    photo: null,
    year: null // CRITICAL: Store as NUMBER (1, 2, 3, 4)
  });
  
  // Form validation state
  const [formErrors, setFormErrors] = useState({});

  // Helper function to get year from application ID (FIXED RANGES)
  const getYearFromId = (id) => {
    if (!id || isNaN(id)) return null;
    
    // Fixed ranges as per requirement
    if (id >= 1 && id <= 22) return 4;      // 1-22 → 4th Year
    if (id >= 23 && id <= 58) return 3;     // 23-58 → 3rd Year
    if (id >= 59 && id <= 82) return 2;     // 59-82 → 2nd Year
    if (id >= 83 && id <= 122) return 1;    // 83-122 → 1st Year
    
    // After 122 → cycle pattern: 4, 3, 2, 1
    const cycle = [4, 3, 2, 1];
    const index = (id - 123) % 4;
    return cycle[index];
  };

  // Convert year number to display label
  const getYearLabel = (year) => {
    if (!year) return "Unknown";
    return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;
  };

  // Get year badge color
  const getYearBadgeColor = (year) => {
    switch(year) {
      case 1: return '#10b981';  // green
      case 2: return '#3b82f6';  // blue
      case 3: return '#f59e0b';  // amber
      case 4: return '#ef4444';  // red
      default: return '#6b7280'; // gray
    }
  };
  const [isImporting, setIsImporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [editImageTarget, setEditImageTarget] = useState(null); // { id, url, type }
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (selectedAuction?._id) {
      fetchData();
      socket = io(API_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
      });
    } else {
      setLoading(false);
    }

    const handleClickOutside = () => setActiveMenuPlayer(null);
    window.addEventListener("click", handleClickOutside);
    
    return () => {
      socket?.disconnect();
      window.removeEventListener("click", handleClickOutside);
    };
  }, [selectedAuction]);

  const [isCapturing, setIsCapturing] = useState(false);

  const getImgUrl = (p) => {
    if (!p) return "/placeholder-player.png";
    const url = p.imageUrl || p.photo?.s3 || p.photo?.drive;
    if (!url) return "/placeholder-player.png";
    
    // If it's a relative path starting with /uploads, prepend the API URL
    if (url.startsWith("/uploads")) {
       return `${API_URL}${url}`;
    }
    
    // If it's an external URL (S3, Drive, etc.), wrap it in our backend proxy to bypass CORS
    if (url.startsWith("http")) {
        return `${API_URL}/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
    }
    
    return url;
  };

  const downloadPosterAsImage = async (p) => {
    setIsCapturing(true);
    const element = document.getElementById("admin-poster-canvas");
    if (!element) return;
    
    try {
        const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 3, 
            backgroundColor: "#0f172a",
            logging: false,
            onclone: (doc) => {
               // Universal Color Sanitizer (Fix for Tailwind v4 oklch/oklab)
               const allElements = doc.getElementsByTagName("*");
               for (let i = 0; i < allElements.length; i++) {
                  const el = allElements[i];
                  const computedStyle = window.getComputedStyle(el);
                  
                  // If color or background uses oklch/oklab, force it to computed RGB
                  if (computedStyle.color.includes("okl")) el.style.color = "#ffffff";
                  if (computedStyle.backgroundColor.includes("okl")) el.style.backgroundColor = "#0f172a";
                  if (computedStyle.borderColor.includes("okl")) el.style.borderColor = "#1e293b";
               }

               const poster = doc.getElementById("admin-poster-canvas");
               if (poster) {
                  poster.style.color = "#ffffff";
                  poster.style.backgroundColor = "#0f172a";
               }
            }
        });
        const data = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${p.name}_Official_Poster.png`;
        link.href = data;
        link.click();
    } catch (err) {
        console.error("Poster export failed", err);
    } finally {
        setIsCapturing(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === "ALL" ? "ALL" : activeTab.toLowerCase();
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/api/players?tournamentId=${selectedAuction._id}&status=${statusParam}&isIcon=false`),
        fetch(`${API_URL}/api/teams?tournamentId=${selectedAuction._id}`)
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

  const sendWhatsAppNotification = (p) => {
    const posterUrl = `${window.location.origin}/card/${p._id}`;
    const text = `Hi ${p.name}, your application for ${selectedAuction.name} has been *ACCEPTED*! ✅\n\nYour Application ID: *#${p.applicationId}*\n\n🔥 *VIEW YOUR OFFICIAL POSTER:* ${posterUrl}\n\nYou are now in the auction pool. See you at the auction! 🏆`;
    const url = `https://wa.me/91${p.mobile}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleApprovePlayer = async (p) => {
    if (!confirm(`Approve ${p.name} and add to auction pool?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/players/${p._id}/approve`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Player approved and added to auction pool!");
        fetchData();
        socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
        
        // Ask to send notification
        if (confirm(`Notification: Send WhatsApp confirmation to ${p.name}?`)) {
           sendWhatsAppNotification(p);
        }
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.message}`);
      }
    } catch (err) {
      alert("Approval error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleAddPlayer = async () => {
    // VALIDATION: Check all required fields
    const errors = {};
    
    if (!newPlayer.name) errors.name = "Player name is required";
    if (!newPlayer.photo) errors.photo = "ID card photo is required";
    if (!newPlayer.role) errors.role = "Playing role is required";
    if (!newPlayer.basePrice || newPlayer.basePrice <= 0) errors.basePrice = "Base price is required";
    if (!newPlayer.mobile) errors.mobile = "Contact number is required";
    else if (!/^\d{10}$/.test(newPlayer.mobile)) errors.mobile = "Must be 10 digits";
    if (!newPlayer.year || ![1,2,3,4].includes(newPlayer.year)) errors.year = "Year selection is required";
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      alert("Please fix the errors below");
      return;
    }
    
    setFormErrors({});
    setLoading(true);
    try {
       // 1. Upload Photo if selected
       let photoUrl = "";
       if (newPlayer.photo) {
         photoUrl = await uploadToS3(newPlayer.photo, "players");
       }

       // 2. Save Player with CORRECT data structure
       const res = await fetch(`${API_URL}/api/players`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ 
           ...newPlayer, 
           tournamentId: selectedAuction._id,
           imageUrl: photoUrl,
           photo: { s3: photoUrl },
           year: Number(newPlayer.year) // ENSURE it's a NUMBER
         })
       });
       
       if (res.ok) {
         const addedP = await res.json();
         alert(`Player ${addedP.name} added successfully with ID ${addedP.applicationId}`);
         setIsAddModalOpen(false);
         setNewPlayer({ 
            name: "", role: "All-Rounder", basePrice: 100, isIcon: false, status: "available", teamId: "",
            age: 20, village: "", mobile: "", battingStyle: "Right Hand Bat", bowlingStyle: "Right arm fast", photo: null, year: null
         });
         setFormErrors({});
         fetchData();
         socket.emit("auctionUpdate", { type: "system_refresh", auctionId: selectedAuction._id });
       } else {
         const err = await res.json();
         alert(`Failed to add: ${err.message}`);
       }
    } catch (err) { 
      console.error(err);
      alert("Error adding player: " + err.message); 
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
                age: Number(findValue(row, ["age", "years", "ವಯಸ್ಸು"])) || 0,
                village: findValue(row, ["village", "town", "city", "ಗ್ರಾಮ", "ಸ್ಥಳ"]) || "-",
                basePrice: Number(findValue(row, ["basePrice", "price", "base price", "amount", "ಮೂಲ ಬೆಲೆ"])) || 100,
                imageUrl: findValue(row, ["imageUrl", "photo", "image", "link", "url", "ಭಾವಚಿತ್ರ"]) || ""
            }));

            const res = await fetch(`${API_URL}/api/players/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ players, tournamentId: selectedAuction._id })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Successfully added ${result.added} new players! (Skipped ${result.skipped} duplicates)`);
                fetchData();
            } else {
                alert("Failed to import players");
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
      const res = await fetch(`${API_URL}/api/players/${editingPlayer._id}`, {
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
    if (!confirm("Are you sure you want to delete this player? The list will be re-indexed automatically.")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/players/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Player deleted and list re-indexed!");
        fetchData();
      }
    } catch (err) {
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleJumble = async () => {
    if (!confirm("Shuffle all player application IDs randomly? This will change the auction sequence.")) return;
    try {
      const res = await fetch(`${API_URL}/api/players/jumble`, {
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
      const res = await fetch(`${API_URL}/api/players/revert-order`, {
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
      const proxyUrl = `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
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

  const downloadPlayerCard = async (p) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, 120] 
    });

    const getBase64 = async (url) => {
        try {
            const res = await fetch(`${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`);
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    };

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 85, 120, "F");
    doc.setFillColor(124, 58, 237); 
    doc.ellipse(42.5, 0, 60, 30, "F");

    const imgData = await getBase64(p.imageUrl);
    if (imgData) {
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(12.5, 15, 60, 60, 10, 10, "F");
        doc.addImage(imgData, "JPEG", 15, 17.5, 55, 55);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(p.name?.toUpperCase() || "PLAYER", 42.5, 85, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "normal");
    doc.text(p.role?.toUpperCase() || "SKILL", 42.5, 92, { align: "center" });

    doc.setFillColor(124, 58, 237);
    doc.roundedRect(27.5, 98, 30, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`ID #${p.applicationId}`, 42.5, 103, { align: "center" });

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(selectedAuction?.name?.toUpperCase() || "TOURNAMENT", 42.5, 112, { align: "center" });
    doc.text("PARMESHWAR CUP - OFFICIAL ID", 42.5, 115, { align: "center" });

    doc.save(`${p.name}_Player_Card.pdf`);
  };

  const downloadPlayersPDF = async () => {
    if (!filtered || filtered.length === 0) {
      alert("No players found for the current search/filter.");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      // 0. Fetch LATEST tournament details (to get organizerLogo if just updated)
      let currentAuction = selectedAuction;
      try {
        const tRes = await fetch(`${API_URL}/api/tournaments/${selectedAuction._id}`);
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
        rowPageBreak: "avoid", // 🔥 Prevents splitting a single player across two pages
        
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
          <h1 className="text-3xl font-black text-white">Player <span className="text-violet-500">Bidding List</span></h1>
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
             <Plus className="w-4 h-4" /> Add Player
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
        {["ALL", "PENDING", "AVAILABLE", "SOLD", "UNSOLD"].map(tab => (
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
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Player</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Year</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Price</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Team</th>
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
                          <img 
                            src={getImgUrl(p)} 
                            onError={(e) => { e.currentTarget.src = '/placeholder-player.png'; e.currentTarget.parentElement.innerHTML = '<div class="w-4 h-4 text-slate-600 flex items-center justify-center"><User size={16} /></div>'; }}
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                             <Edit3 className="w-3 h-3 text-white" />
                          </div>
                       </div>
                       <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenuPlayer(activeMenuPlayer === p._id ? null : p._id); }}
                          className="text-sm font-black text-white leading-tight hover:text-violet-400 transition-colors block text-left"
                        >
                          {p.name}
                        </button>
                        
                        {activeMenuPlayer === p._id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <button 
                               onClick={() => { setHistoryPlayer(p); setActiveMenuPlayer(null); }}
                               className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all"
                             >
                                <RefreshCw className="w-3 h-3 text-violet-500" /> Open Bid History
                             </button>
                             <Link 
                               href={`/live-auction?id=${selectedAuction._id}&player=${p.applicationId}`}
                               className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-3 transition-all"
                             >
                                <Zap className="w-3 h-3 text-cyan-500" /> Live Auction
                             </Link>
                          </div>
                        )}

                          {p.isIcon && <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter flex items-center gap-0.5 mt-1"><Trophy className="w-2 h-2" /> ICON</span>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">{p.role}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const yearNum = getYearFromId(p.applicationId);
                      const yearLabel = getYearLabel(yearNum);
                      const badgeColor = getYearBadgeColor(yearNum);
                      
                      return (
                        <span 
                          className="text-xs font-black px-3 py-1 rounded-xl border"
                          style={{ 
                            background: `${badgeColor}15`, // 15 = ~10% opacity
                            borderColor: `${badgeColor}30`, // 30 = ~20% opacity
                            color: badgeColor
                          }}
                        >
                          {yearLabel}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        p.status === 'sold' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                        p.status === 'unsold' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
                     }`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-sm">{p.status === 'sold' ? `₹${p.soldPrice?.toLocaleString()}` : <span className="text-slate-700 italic">₹{p.basePrice}</span>}</td>
                  <td className="px-6 py-4">
                     <Link 
                        href={`/team/${p.team?._id}?tournament=${selectedAuction._id}&from=sold&highlight=${p._id}`}
                        className="text-[10px] font-black uppercase text-slate-400 hover:text-violet-400 transition-colors truncate max-w-[100px] block"
                     >
                        {p.team?.name || "—"}
                     </Link>
                  </td>
                  <td className="px-6 py-4">
                     {p.teamSlotId ? (
                        <Link 
                          href={`/team/${p.team?._id || p.team}?tournament=${selectedAuction._id}&from=sold&highlight=${p._id}`}
                          className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all active:scale-95 block w-fit"
                        >
                           {p.teamSlotId}
                        </Link>
                     ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'pending' && (
                          <button 
                            onClick={() => handleApprovePlayer(p)}
                            className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" 
                            title="Approve & Notify (WhatsApp)"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <Link 
                          href={`/live-auction?id=${selectedAuction._id}&player=${p.applicationId}`}
                          className="p-2 bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white rounded-xl transition-all" 
                          title="Live Bidding"
                        >
                          <Zap className="w-4 h-4" />
                        </Link>
                         <button onClick={() => setSelectedVerifyPlayer(p)} className="p-2 bg-white/5 hover:bg-violet-600/20 text-slate-400 hover:text-violet-400 rounded-xl transition-all" title="View Verification Details">
                           <Eye className="w-4 h-4" />
                         </button>
                         <button onClick={() => sendWhatsAppNotification(p)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Send Official WhatsApp Confirmation">
                           <Phone size={14} />
                         </button>
                         <button onClick={() => openManageModal(p)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Manage">
                           <MousePointer2 className="w-4 h-4" />
                         </button>
                        <button disabled={loading} onClick={() => handleDeletePlayer(p._id)} className="p-2 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed" title="Delete">
                          <X className="w-4 h-4" />
                        </button>
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
                 <h2 className="text-xl font-black text-white">Manual <span className="text-violet-500">Player Entry</span></h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 {/* Points System Info Banner */}
                 <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div>
                       <h3 className="text-xs font-black text-cyan-500 uppercase tracking-widest mb-1">Points System Auction</h3>
                       <p className="text-[9px] text-slate-400 font-bold">All prices in PTS (not ₹). Year category is mandatory for squad distribution.</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - REQUIRED FIELDS */}
                    <div className="space-y-4">
                       {/* Player Name - REQUIRED */}
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            className={`w-full bg-slate-900 border ${formErrors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500`} 
                            value={newPlayer.name} 
                            onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} 
                            placeholder="Enter player name" 
                          />
                          {formErrors.name && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.name}</p>}
                       </div>

                       {/* Playing Role - REQUIRED */}
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Playing Role <span className="text-red-500">*</span>
                          </label>
                          <select 
                            className={`w-full bg-slate-900 border ${formErrors.role ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500 cursor-pointer`} 
                            value={newPlayer.role} 
                            onChange={e => setNewPlayer({...newPlayer, role: e.target.value})}
                          >
                             <option value="">Select Role</option>
                             {["Batsman", "Bowler", "All-Rounder", "Wicketkeeper", "WK-Batsman"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {formErrors.role && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.role}</p>}
                       </div>

                       {/* Year Selection - CRITICAL & REQUIRED */}
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Year Category <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => setNewPlayer({...newPlayer, year: yr})}
                                className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                                  newPlayer.year === yr
                                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 border-violet-500 text-white shadow-lg scale-105'
                                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                                }`}
                              >
                                {yr}{yr === 1 ? 'st' : yr === 2 ? 'nd' : yr === 3 ? 'rd' : 'th'}
                              </button>
                            ))}
                          </div>
                          {formErrors.year && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.year}</p>}
                       </div>

                       {/* Contact Number - REQUIRED with Validation */}
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Contact Number <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="tel"
                            maxLength={10}
                            className={`w-full bg-slate-900 border ${formErrors.mobile ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500`} 
                            value={newPlayer.mobile} 
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, ''); // Only digits
                              setNewPlayer({...newPlayer, mobile: val});
                            }}
                            placeholder="10-digit mobile number" 
                          />
                          {formErrors.mobile && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.mobile}</p>}
                       </div>
                    </div>

                    {/* Right Column - Price & Photo */}
                    <div className="space-y-4">
                       {/* Base Price - REQUIRED (PTS not ₹) */}
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Base Price (PTS) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="number" 
                            className={`w-full bg-slate-900 border ${formErrors.basePrice ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500`} 
                            value={newPlayer.basePrice} 
                            onChange={e => setNewPlayer({...newPlayer, basePrice: parseInt(e.target.value) || 0})}
                            placeholder="Enter points (e.g., 50)" 
                          />
                          {formErrors.basePrice && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.basePrice}</p>}
                       </div>

                       {/* Age & Village (Optional) */}
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Age (Optional)</label>
                             <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.age} onChange={e => setNewPlayer({...newPlayer, age: parseInt(e.target.value) || 0})} />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location (Optional)</label>
                             <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.village} onChange={e => setNewPlayer({...newPlayer, village: e.target.value})} placeholder="Village/Town" />
                          </div>
                       </div>

                       {/* Photo Upload - REQUIRED */}
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            Upload ID Card / Player Photo <span className="text-red-500">*</span>
                          </label>
                          <div className={`relative h-28 bg-white/5 border-2 ${formErrors.photo ? 'border-red-500' : 'border-dashed border-white/10'} rounded-2xl flex flex-col items-center justify-center group hover:border-violet-500/50 transition-all`}>
                             {newPlayer.photo ? (
                                <div className="text-center w-full h-full p-2">
                                   <img src={URL.createObjectURL(newPlayer.photo)} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                   <button type="button" onClick={() => setNewPlayer({...newPlayer, photo: null})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X size={12} /></button>
                                </div>
                             ) : (
                                <>
                                   <Plus className="w-6 h-6 text-slate-600 group-hover:text-violet-500 transition-colors" />
                                   <p className="text-[10px] font-black text-slate-600 uppercase mt-1">Click to upload image</p>
                                   <p className="text-[8px] text-slate-700 font-bold mt-0.5">JPG, PNG (Max 5MB)</p>
                                </>
                             )}
                             <input type="file" accept="image/*" onChange={e => setNewPlayer({...newPlayer, photo: e.target.files[0]})} className="absolute inset-0 opacity-0 cursor-pointer" disabled={!!newPlayer.photo} />
                          </div>
                          {formErrors.photo && <p className="text-[8px] text-red-400 font-bold mt-1">{formErrors.photo}</p>}
                       </div>

                       {/* Batting & Bowling Styles (Optional) */}
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batting (Optional)</label>
                             <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500 cursor-pointer" value={newPlayer.battingStyle} onChange={e => setNewPlayer({...newPlayer, battingStyle: e.target.value})}>
                                <option value="Right Hand Bat">Right Hand</option>
                                <option value="Left Hand Bat">Left Hand</option>
                             </select>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bowling (Optional)</label>
                             <input className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.bowlingStyle} onChange={e => setNewPlayer({...newPlayer, bowlingStyle: e.target.value})} placeholder="Style" />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Icon Player Section */}
                 {newPlayer.isIcon && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 border-t border-white/5 pt-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Team</label>
                       <select className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500" value={newPlayer.teamId} onChange={e => setNewPlayer({...newPlayer, teamId: e.target.value})}>
                          <option value="">Select Team</option>
                          {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                       </select>
                    </div>
                 )}

                 <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 accent-violet-500" checked={newPlayer.isIcon} onChange={e => setNewPlayer({...newPlayer, isIcon: e.target.checked})} id="icon-check" />
                    <label htmlFor="icon-check" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer">Mark as Icon Player</label>
                 </div>

                 <button 
                   onClick={handleAddPlayer} 
                   disabled={loading}
                   className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {loading ? "SAVING..." : "SAVE PLAYER TO DATABASE"}
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
                       <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Drafted Team</label>
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
                const { uploadUrl, fileUrl } = await fetch(`${API_URL}/api/upload/get-upload-url?fileType=${fileType}&folder=players`).then(r => r.json());
                
                // 2. Upload to S3
                await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": fileType } });
                
                // 3. Update DB
                const res = await fetch(`${API_URL}/api/players/${editImageTarget.id}`, {
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

      {/* ── BID HISTORY MODAL ── */}
      {historyPlayer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-[#0B0F2A] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center text-violet-400 border border-violet-500/20">
                       <RefreshCw className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight">Bid History</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{historyPlayer.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setHistoryPlayer(null)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/10">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                 {(!historyPlayer.bidHistory || historyPlayer.bidHistory.length === 0) ? (
                    historyPlayer.status === 'sold' ? (
                       <div className="flex items-center justify-between p-4 bg-white/[0.04] border border-violet-500/30 rounded-2xl group transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-4 h-4" />
                             </div>
                             <div>
                                <Link 
                                   href={`/team/${historyPlayer.team?._id || historyPlayer.team}?tournament=${selectedAuction._id}&from=sold&highlight=${historyPlayer._id}`}
                                   className="text-xs font-black text-white hover:text-violet-400 transition-colors uppercase tracking-tight block"
                                >
                                   {historyPlayer.team?.name || 'Assigned Team'}
                                </Link>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">Final Award Entry</p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-right">
                             {historyPlayer.teamSlotId && (
                                <Link 
                                  href={`/team/${historyPlayer.team?._id || historyPlayer.team}?tournament=${selectedAuction._id}&from=sold&highlight=${historyPlayer._id}`}
                                  className="text-[8px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md hover:bg-cyan-500/20 transition-all"
                                >
                                   {historyPlayer.teamSlotId}
                                </Link>
                             )}
                             <p className="text-sm font-black text-emerald-400">₹{historyPlayer.soldPrice?.toLocaleString()}</p>
                             <p className="text-[8px] text-emerald-500/40 font-black uppercase tracking-tighter">Legacy Record</p>
                          </div>
                       </div>
                    ) : (
                       <div className="py-20 text-center space-y-4 opacity-40">
                          <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto" />
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No Bidding Traffic Recorded</p>
                       </div>
                    )
                 ) : (
                    <div className="space-y-3">
                       {[...historyPlayer.bidHistory].reverse().map((bid, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-violet-500/30 transition-all">
                             <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white/5">
                                   #{historyPlayer.bidHistory.length - idx}
                                </div>
                                <div>
                                   <Link 
                                      href={`/team/${bid.teamId}?tournament=${selectedAuction._id}&from=sold&highlight=${historyPlayer._id}`}
                                      className="text-xs font-black text-white hover:text-violet-400 transition-colors uppercase tracking-tight block"
                                   >
                                      {bid.teamName}
                                   </Link>
                                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                      {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                   </p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-emerald-400">₹{bid.bidAmount?.toLocaleString()}</p>
                                <p className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">Verified Bid</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Winning Status</span>
                    <span className={`text-xs font-black uppercase ${historyPlayer.status === 'sold' ? 'text-emerald-400' : 'text-red-400'}`}>
                       {historyPlayer.status}
                    </span>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Final Price</span>
                    <p className="text-xl font-black text-white">₹{historyPlayer.soldPrice?.toLocaleString() || '0'}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* ── VERIFICATION MODAL ── */}
      {selectedVerifyPlayer && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="max-w-4xl w-full bg-[#0f172a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
                <button onClick={() => setSelectedVerifyPlayer(null)} className="absolute top-8 right-8 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 transition-all z-20"><X size={20} /></button>
                <div className="grid grid-cols-1 md:grid-cols-12">
                   <div className="md:col-span-5 bg-black/40 p-10 flex flex-col items-center gap-8 justify-center border-r border-white/5">
                      <div id="admin-poster-canvas" style={{ backgroundColor: '#0f172a' }} className="p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-6">
                         <div className="text-center">
                            <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-[#a78bfa] opacity-80">PARMESHWAR CUP</h2>
                            <h1 className="text-sm font-black text-white italic tracking-tighter uppercase">Official Poster</h1>
                         </div>
                         <img 
                           src={getImgUrl(selectedVerifyPlayer)} 
                           crossOrigin="anonymous" 
                           onError={(e) => { e.currentTarget.src = '/placeholder-player.png'; }}
                           className="w-56 h-56 object-cover rounded-[2.5rem] border-4 border-white/10 shadow-xl" 
                         />
                         <div className="text-center space-y-1">
                            <h3 className="text-2xl font-black text-white italic tracking-tighter leading-none">{selectedVerifyPlayer.name}</h3>
                            <p className="text-[9px] font-black text-[#94a3b8] uppercase tracking-widest leading-none">ID #{selectedVerifyPlayer.applicationId}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                             <div className="text-center"><p className="text-[7px] font-black text-[#475569] uppercase">ROLE</p><p className="text-[9px] font-black text-white">{selectedVerifyPlayer.role}</p></div>
                             <div className="text-center"><p className="text-[7px] font-black text-[#475569] uppercase">STYLE</p><p className="text-[9px] font-black text-white">{selectedVerifyPlayer.battingStyle || "RHB"}</p></div>
                         </div>
                      </div>
                      <div className="w-full space-y-6">
                         <div className="p-5 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-all" onClick={() => window.open(selectedVerifyPlayer.aadhaarUrl, '_blank')}>
                            <div className="flex items-center justify-between mb-3"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aadhaar Evidence</p><ExternalLink size={12} className="text-violet-500" /></div>
                            {selectedVerifyPlayer.aadhaarUrl ? <img src={selectedVerifyPlayer.aadhaarUrl} className="w-full h-32 object-cover rounded-xl" /> : <div className="h-32 rounded-xl bg-slate-900 flex items-center justify-center text-[9px] font-black text-slate-800 uppercase italic">No identity proof attached</div>}
                         </div>
                      </div>
                   </div>
                   <div className="md:col-span-7 p-12 space-y-10">
                      <div>
                         <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.4em] mb-2 leading-none">Registry Record Verification</p>
                         <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">{selectedVerifyPlayer.name}</h2>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3">FATHER: {selectedVerifyPlayer.fatherName || "UNSPECIFIED"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                         <DetailNode icon={Phone} label="Mobile Node" value={selectedVerifyPlayer.mobile} />
                         <DetailNode icon={CreditCard} label="Aadhaar ID" value={selectedVerifyPlayer.aadhaarNumber} />
                         <DetailNode icon={MapPin} label="Regional Sector" value={`${selectedVerifyPlayer.taluk} > ${selectedVerifyPlayer.hobli}`} />
                         <DetailNode icon={Activity} label="Village / Ward" value={selectedVerifyPlayer.village} />
                         <DetailNode icon={Activity} label="Skill Profile" value={`${selectedVerifyPlayer.role} (${selectedVerifyPlayer.battingStyle || selectedVerifyPlayer.playingStyle})`} />
                         <DetailNode icon={Activity} label="Wicket Keeper" value={selectedVerifyPlayer.wicketKeeper ? "YES (ACTIVE)" : "NO (INACTIVE)"} color={selectedVerifyPlayer.wicketKeeper ? "text-emerald-400" : "text-red-400"} />
                      </div>
                      <div className="pt-10 border-t border-white/5 flex flex-wrap gap-4">
                        <button 
                          onClick={() => downloadPosterAsImage(selectedVerifyPlayer)} 
                          className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2"
                          disabled={isCapturing}
                        >
                           {isCapturing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download size={14} />}
                           {isCapturing ? "Capturing..." : "Download Poster (PNG Image)"}
                        </button>
                        <button onClick={() => downloadPlayerCard(selectedVerifyPlayer)} className="px-6 py-5 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-violet-600/20 hover:scale-105 transition-all flex items-center gap-2">
                           <Download size={14} /> Download PDF ID
                        </button>
                        <button onClick={() => setSelectedVerifyPlayer(null)} className="flex-1 py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Done</button>
                      </div>
                   </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

function DetailNode({ icon: Icon, label, value, color="text-white" }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 opacity-40"><Icon size={12} className="text-slate-400" /><p className="text-[9px] font-black uppercase tracking-widest">{label}</p></div>
            <p className={`text-xs font-bold uppercase tracking-widest truncate ${color}`}>{value || "---"}</p>
        </div>
    );
}

const ExternalLink = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);
const MapPin = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);
const Activity = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);
const Phone = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
);
const CreditCard = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);
