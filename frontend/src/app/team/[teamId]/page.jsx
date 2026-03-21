"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { FaUsers, FaBolt, FaArrowLeft, FaDownload } from "react-icons/fa"
import { MdAttachMoney } from "react-icons/md"
import { GiCricketBat, GiTargetArrows } from "react-icons/gi"
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./team-squad.css"

const getProxiedUrl = (url) => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;
  return `${process.env.NEXT_PUBLIC_API_URL}/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
};

// Simple Player Display - Profile image with price and name below
const PlayerItem = ({ player }) => {
  if (!player) return null;
  
  return (
    <div className="player-card" style={{ width: '80px', textAlign: 'center' }}>
      <div style={{
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #00ffcc',
        boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)'
      }}>
        <Image
          src={player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
          alt={player.name}
          width={70}
          height={70}
          style={{ objectFit: 'cover' }}
        />
      </div>
      <span style={{
        fontSize: '12px',
        color: '#00ffcc',
        fontWeight: 'bold'
      }}>₹{player.soldPrice?.toLocaleString() || 0}</span>
      <span style={{
        fontSize: '12px',
        color: 'white',
        fontWeight: 'bold',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>{player.name}</span>
    </div>
  );
};

// Player Row Component - Glass card layout
const PlayerRow = ({ title, players, icon }) => {
  return (
    <div className="glass-card">
      <div className="section-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          {title}
        </span>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>
          ({players.length})
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        padding: '10px 0',
      }}>
        {players.length === 0 ? (
          <span className="empty-state">No players yet</span>
        ) : (
          players.map((player, index) => (
            <PlayerItem key={player._id || player.id || index} player={player} />
          ))
        )}
      </div>
    </div>
  );
};

function TeamSquadContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [team, setTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const teamId = params.teamId
  const tournamentId = searchParams.get('tournament')
  const [squadBg, setSquadBg] = useState('/backgrounds/squad-bg.jpg')
  const [activeAssets, setActiveAssets] = useState({
    squadBgUrl: "/backgrounds/squad-bg.jpg",
    badges: { leftBadge: "/badges/squad-badge.png", rightBadge: "/badges/badge.png" }
  })

  // Fetch images logic removed in favor of integrated tournament.assets

  const downloadSquad = async () => {
    const element = document.getElementById("squad-download");
    if (!element) return;
    
    // Make visible but keep off-screen for capture
    element.style.display = "block";
    
    try {
      // Slightly lower scale (1.5) for much faster processing while keeping detail
      const canvas = await html2canvas(element, {
        backgroundColor: "#020617",
        scale: 1.5,
        useCORS: true,
        logging: false,
        allowTaint: true,
        imageTimeout: 0 // Don't wait too long for images
      });

      const link = document.createElement("a");
      link.download = `${team?.name || 'squad'}.png`;
      link.href = canvas.toDataURL("image/png", 0.8); // 0.8 quality for speed
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      element.style.display = "none";
    }
  };
   const getBase64FromUrl = async (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
      const proxied = getProxiedUrl(url);
      const res = await fetch(proxied);
      if (!res.ok) return null;
      
      const blob = await res.blob();

      // Handle PDF or other documents by showing a placeholder icon
      if (blob.type.includes('pdf')) {
        // Red PDF placeholder base64
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwOC8wOC8xOFR968AAAAAYdEVYdFNvZnR3YXJlAEFkb2JlIEM2IEltYWdlUmVhZHm7mNoAAAAtSURBVHic7cExAQAAAMKg9U9tCy+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+DAx9AAH5XU8AAAAAAElFTkSuQmCC";
      }

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Base64 fetch failed:", err);
      return null;
    }
  };

  const compressImage = (base64, quality = 0.5) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 120;
        canvas.width = size;
        canvas.height = size;
        
        // Solid background for transparent PNGs
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        // Fallback for broken images
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#F1F5F9";
        ctx.fillRect(0, 0, 120, 120);
        resolve(canvas.toDataURL("image/jpeg"));
      };
    });
  };


  const downloadSquadPDF = async () => {
    if (!team || !squad.length) return;
    setIsDownloadingPdf(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const tournamentTitle = "Parmeshwar Cup 2026";
      const teamName = team.name?.toUpperCase() || "SQUAD LIST";
      const budget = (team.purse || team.remainingBudget || 0).toLocaleString();
      // FORCE RESET character spacing (IMPORTANT: Fixes stretched text "B u d g e t")
      if (doc.setCharSpace) doc.setCharSpace(0);

      // 1. Watermark (Subtle)
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.04 }));
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(50);
      doc.text(tournamentTitle, pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 45,
      });
      doc.restoreGraphicsState();
      // 2. HEADER (Resetting char spacing again for absolute safety)
      if (doc.setCharSpace) doc.setCharSpace(0);
      doc.setFont(undefined, "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 50, 90);
      doc.text(teamName, pageWidth / 2, 15, { align: "center" });

      doc.setFont(undefined, "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(tournamentTitle, 14, 22);
      
      // FIXED: Strictly right align at x=190 (SAFE DISTANCE FROM EDGE)
      // Reinforcing Bold + No Char Spacing
      if (doc.setCharSpace) doc.setCharSpace(0);
      doc.setFont(undefined, "bold");
      const budgetVal = Number(team.purse || team.remainingBudget || 0);
      doc.text(`Budget Left: ₹${budgetVal.toLocaleString("en-IN")}`, 190, 22, { align: "right" });
      doc.setFont(undefined, "normal"); // Reset for rest of header

      // Divider Line
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 28, 196, 28);

      // 3. SECTION 1: RETAINED PLAYERS
      // 3. SECTION 1: RETAINED PLAYERS (ALWAYS SHOW 3 SLOTS AS REQUESTED)
      const actualIcons = squad.filter(p => !!p.isIcon);
      const iconPlayers = actualIcons.length > 0 ? actualIcons : Array(3).fill({ name: "To be confirmed", isPlaceholder: true });
      const auctionPlayers = squad.filter(p => !p.isIcon && p.status === 'sold');
      
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text("Retained Players", 14, 35);
      
      // Container Box (180x50)
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(252, 252, 253);
      doc.rect(14, 38, 180, 50, "F");
      doc.rect(14, 38, 180, 50);

      // Center players inside the box (Proper grid for 3 items)
      // pageWidth is ~210. Box is 180 (from x=14 to x=194).
      // For 3 items we use 50 spacing. 150 total width.
      let startX = (pageWidth / 2) - ((iconPlayers.length * 50) / 2) + 15; 
      let imgY = 43;
      
      for (const p of iconPlayers) {
        // Fallback to Team Logo for placeholders
        const photoUrl = p.isPlaceholder ? (team.logo || team.logoUrl) : (p.photo?.s3 || p.imageUrl || p.image || team.logo || team.logoUrl);
        const rawImg = await getBase64FromUrl(photoUrl);
        const compImg = rawImg ? await compressImage(rawImg, 0.7) : null;
        
        if (compImg) {
          doc.addImage(compImg, "JPEG", startX, imgY, 20, 20);
          doc.setDrawColor(16, 185, 129); 
          doc.rect(startX, imgY, 20, 20);
        }

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, "bold");
        const pName = p.name ? p.name.substring(0, 15) : "To be confirmed";
        doc.text(pName, startX + 10, imgY + 25, { align: "center" });

        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129);
        doc.setFont(undefined, "normal");
        doc.text("Retained", startX + 10, imgY + 30, { align: "center" });

        startX += 50; 
      }

      // 4. SECTION 2: BOUGHT PLAYERS (TABLE)
      if (doc.setCharSpace) doc.setCharSpace(0); // Safety reset for table
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.setFont(undefined, "bold");
      doc.text("Bought Players", 14, 95);

      // Map players with proper currency format
      const tableData = await Promise.all(auctionPlayers.map(async (p, i) => {
        const rawImg = await getBase64FromUrl(p.photo?.s3 || p.imageUrl || p.image);
        const compressed = rawImg ? await compressImage(rawImg, 0.6) : null;
        return {
          id: i + 1,
          image: compressed,
          name: p.name || "-",
          role: p.role || "-",
          village: p.village || "-",
          price: `₹${Number(p.soldPrice || 0).toLocaleString("en-IN")}`
        };
      }));

      autoTable(doc, {
        startY: 100,
        columns: [
          { header: "Sl No", dataKey: "id" },
          { header: "Photo", dataKey: "image" },
          { header: "Player Name", dataKey: "name" },
          { header: "Role", dataKey: "role" },
          { header: "Village", dataKey: "village" },
          { header: "Sold Price", dataKey: "price" }
        ],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [25, 50, 90], 
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        styles: { 
          fontSize: 10, 
          valign: 'middle', 
          minCellHeight: 18,
          overflow: "linebreak",
          cellPadding: 3 
        },
        columnStyles: {
           id: { halign: 'center', cellWidth: 15 },
           image: { cellWidth: 20 },
           name: { fontStyle: 'bold', cellWidth: 45 },
           role: { cellWidth: 35 },
           village: { cellWidth: 35 },
           price: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
        },
        didParseCell: (data) => {
          if (data.column.dataKey === 'image' && data.section === 'body') {
            data.cell.text = ""; 
          }
          if (data.column.dataKey === 'price') {
            data.cell.styles.halign = "right"; // FORCED Double-safety
            if (data.section === 'body') {
               data.cell.styles.textColor = [0, 150, 0];
            }
          }
        },
        didDrawCell: (dataCell) => {
          if (dataCell.column.dataKey === 'image' && dataCell.row.section === 'body') {
            const item = dataCell.row.raw;
            if (item?.image) {
              const size = 14;
              const x = dataCell.cell.x + (dataCell.cell.width - size) / 2;
              const y = dataCell.cell.y + (dataCell.cell.height - size) / 2;
              try {
                doc.addImage(item.image, "JPEG", x, y, size, size);
              } catch (e) {
                console.warn("Table img skipped");
              }
            }
          }
        }
      });

      // 5. Footer (Page Numbers)
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setDrawColor(220, 220, 220);
        doc.line(14, pageHeight - 15, 196, pageHeight - 15);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${totalPages}`, 196, pageHeight - 10, { align: "right" });
        doc.text(`${team.name} Official Squad Report`, 14, pageHeight - 10);
      }

      doc.save(`${team.name.replace(/\s+/g, '_')}_Official_Squad.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export professional squad report.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Fetch team and players data from API
  useEffect(() => {
    if (!teamId) return

    const fetchTeamSquad = async () => {
      try {
        // Try the teams API first
        let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/${teamId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('Team fetched from API:', data.name, 'Logo:', data.logo || data.logoUrl)
          setTeam({
            ...data,
            logo: data.logo || data.logoUrl, // Ensure logo is set from logoUrl
            purse: data.purse || data.remainingBudget || 0
          })
          setPlayers(data.squad || [])
          setLoading(false)
          return
        }
        
        // Fallback to tournament data if teams API fails
        console.log('Teams API not available, trying tournament data...')
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${tournamentId}`)
        
        if (res.ok) {
          const tournamentData = await res.json()
          
          // Apply Context-Specific Brading
          if (tournamentData.tournament?.assets) {
             const tAssets = tournamentData.tournament.assets;
             setActiveAssets({
                squadBgUrl: tAssets.squadBgUrl || "/backgrounds/squad-bg.jpg",
                badges: tAssets.badges || { leftBadge: "/badges/squad-badge.png", rightBadge: "/badges/badge.png" }
             });
             setSquadBg(tAssets.squadBgUrl || "/backgrounds/squad-bg.jpg");
          }

          const foundTeam = tournamentData.teams?.find(t => t._id === teamId)
          
          if (foundTeam) {
            console.log('Team found in tournament data:', foundTeam.name)
            setTeam({
              ...foundTeam,
              logo: foundTeam.logoUrl || foundTeam.logo,
              purse: foundTeam.remainingBudget || foundTeam.purse || 0
            })
            setPlayers(tournamentData.players?.filter(p => p.team === teamId) || [])
            setLoading(false)
            return
          }
        }
        
        throw new Error('Team not found')
      } catch (err) {
        console.error('Failed to fetch team squad:', err)
        setError('Failed to load team squad')
        setLoading(false)
      }
    }

    fetchTeamSquad()
  }, [teamId, tournamentId])


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading team squad...</div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Team Not Found</h1>
          <p className="text-slate-400 mb-6">{error || "The requested team could not be found."}</p>
          <Link 
            href="/teams" 
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    )
  }

  const squad = team.squad || players || []
  return (
    <div className="page-wrapper" style={{
      background: `linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.5)), url('${squadBg}') center/cover no-repeat fixed`,
      color: 'white'
    }}>

      {/* TOURNAMENT BADGES (EXTREME RIGHT POSITIONING) */}
      <img 
        src={activeAssets.badges?.leftBadge || "/badges/squad-badge.png"}
        crossOrigin="anonymous" 
        alt="Tournament Badge" 
        className="badge-top"
      />
      <img 
        src={activeAssets.badges?.rightBadge || "/badges/badge.png"}
        crossOrigin="anonymous" 
        alt="Creator Logo" 
        className="badge-bottom"
      />

      <div className="page">
        {/* HEADER */}
        <div className="header">
          {/* Top Bar with Navigation and Download */}
          <div className="top-bar">
            {/* Back Button */}
            <Link 
              href={tournamentId ? `/teams?tournament=${tournamentId}` : "/teams"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '10px 16px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8'
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)'
              }}
            >
              <FaArrowLeft /> Back
            </Link>

            <button 
              onClick={downloadSquad}
              className="download-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(0, 255, 204, 0.1)',
                border: '1px solid rgba(0, 255, 204, 0.4)',
                color: '#00ffcc',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 204, 0.2)'
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 204, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <FaDownload /> Image
            </button>

            <button 
              onClick={downloadSquadPDF}
              disabled={isDownloadingPdf}
              className="download-pdf-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(124, 58, 237, 0.1)', 
                border: '1px solid rgba(124, 58, 237, 0.4)',
                color: '#a78bfa',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: isDownloadingPdf ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDownloadingPdf) {
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)'
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {isDownloadingPdf ? (
                 <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%' }}></div>
              ) : <FaDownload />}
              {isDownloadingPdf ? 'Exporting...' : 'PDF Report'}
            </button>
          </div>

          {/* CENTERED TEAM LOGO HEADER */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 20px 20px'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(0, 255, 204, 0.5)',
              boxShadow: '0 0 30px rgba(0, 255, 204, 0.3)',
              marginBottom: '16px'
            }}>
              <Image
                src={team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`}
                alt={team.name}
                width={100}
                height={100}
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            
            <h1>{team.name}</h1>
            
            <p>
              {squad.length} Players • <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{team.purse?.toLocaleString() || team.remainingBudget?.toLocaleString() || 0} Purse</span>
            </p>
          </div>
        </div>

        {/* MAIN CONTENT WITH SIDEBAR */}
        <div className="content">
          {(() => {
            // Use local copies of player groups to avoid recalculating unnecessarily in larger blocks
            // Separate icon players (isIcon = true) from auction players
            const iconPlayers = squad.filter(p => !!p.isIcon)
            const auctionPlayers = squad.filter(p => !p.isIcon && p.status === 'sold')
            
            const batsmen = auctionPlayers.filter(p => p.role?.toLowerCase().includes('bat'))
            const allrounders = auctionPlayers.filter(p => p.role?.toLowerCase().includes('all'))
            const bowlers = auctionPlayers.filter(p => p.role?.toLowerCase().includes('bowl'))
            const others = auctionPlayers.filter(p => 
              !batsmen.includes(p) && !allrounders.includes(p) && !bowlers.includes(p)
            )

            return (
              <>
                {/* LEFT PANEL - Icon Players */}
                <div className="left-panel">
                  <div className="glass-card">
                    <div className="section-header" style={{ justifyContent: 'center', marginBottom: '15px' }}>
                      ⭐ Icon Players
                    </div>
                    
                    {iconPlayers.length === 0 ? (
                      <p className="empty-state" style={{ textAlign: 'center' }}>
                        No icon players
                      </p>
                    ) : (
                      <div className="icon-list">
                        {iconPlayers.map((player, index) => (
                          <div key={player._id || player.id || index} className="player-card">
                            <div style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '3px solid #10b981',
                              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                            }}>
                              <Image
                                src={player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                                alt={player.name}
                                width={80}
                                height={80}
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>RETAINED</span>
                            <span style={{ fontSize: '12px', color: 'white', fontWeight: 'bold', textAlign: 'center', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT PANEL - Auction Players */}
                <div className="right-panel">
                  <PlayerRow title="Batsmen" players={batsmen} icon={<GiCricketBat />} />
                  <PlayerRow title="All-Rounders" players={allrounders} icon={<FaBolt />} />
                  <PlayerRow title="Bowlers" players={bowlers} icon={<GiTargetArrows />} />
                  {others.length > 0 && (
                    <PlayerRow title="Others" players={others} icon={<FaUsers />} />
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {/* HIDDEN EXPORT SECTION (Rendered off-screen for capture) */}
        <div id="squad-download" style={{
          position: 'fixed',
          left: '-5000px',
          top: '0',
          width: '1200px',
          height: 'auto',
          minHeight: '1200px',
          background: `url('${getProxiedUrl(squadBg)}') center/cover no-repeat`,
          backgroundColor: '#020617',
          padding: '60px 40px',
          display: 'none',
          zIndex: -9999,
          fontFamily: 'sans-serif'
        }}>
          {/* Overlay for Export */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(11, 28, 44, 0.6), rgba(11, 28, 44, 0.4))',
            zIndex: 1
          }}></div>

          {/* Team Info in Export */}
          <div style={{ 
            position: 'relative', 
            zIndex: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginBottom: '50px' 
          }}>
            <img 
              src={getProxiedUrl(team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=random`)} 
              crossOrigin="anonymous" 
              style={{ width: '130px', height: '130px', borderRadius: '50%', border: '6px solid #00ffcc', objectFit: 'cover', marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.1)' }} 
              alt=""
            />
            <h1 style={{ color: 'white', fontSize: '64px', margin: '0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px' }}>{team.name}</h1>
            <div style={{ height: '4px', width: '120px', background: '#00ffcc', margin: '20px auto' }}></div>
            <p style={{ color: '#00ffcc', fontSize: '32px', margin: '0', fontWeight: '500', letterSpacing: '2px' }}>OFFICIAL SQUAD</p>
          </div>

          {/* Player Grid in Export - DYNAMIC SCALING based on squad size */}
          {(() => {
            const squadSize = squad.length;
            let columns = 5;
            let imgSize = '100px';
            let nameSize = '16px';
            let metaSize = '13px';
            let contactSize = '11px';
            let itemWidth = '160px';
            let gap = '30px 20px';

            if (squadSize > 15 && squadSize <= 24) {
              columns = 6;
              imgSize = '85px';
              nameSize = '14px';
              metaSize = '12px';
              contactSize = '10px';
              itemWidth = '140px';
              gap = '25px 15px';
            } else if (squadSize > 24) {
              columns = 7;
              imgSize = '70px';
              nameSize = '12px';
              metaSize = '11px';
              contactSize = '9px';
              itemWidth = '120px';
              gap = '20px 10px';
            }

            return (
              <div style={{ 
                position: 'relative', 
                zIndex: 3, 
                display: 'grid', 
                gridTemplateColumns: `repeat(${columns}, 1fr)`, 
                gap: gap,
                justifyItems: 'center',
                padding: '0 40px',
                width: '100%'
              }}>
                {squad.map((player, idx) => (
                  <div key={idx} style={{ textAlign: 'center', width: itemWidth }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={getProxiedUrl(player.photo?.s3 || player.imageUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`)} 
                        crossOrigin="anonymous" 
                        style={{ width: imgSize, height: imgSize, borderRadius: '50%', border: '3px solid white', objectFit: 'cover', background: 'rgba(255,255,255,0.1)' }} 
                        alt=""
                      />
                      {player.isIcon && (
                        <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#10b981', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>ICON</div>
                      )}
                    </div>
                    <div style={{ 
                      color: 'white', 
                      fontWeight: '900', 
                      fontSize: nameSize, 
                      lineHeight: '1.1',
                      marginTop: '8px', 
                      marginBottom: '2px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      textTransform: 'uppercase'
                    }}>{player.name}</div>
                    
                    <div style={{ color: '#00ffcc', fontSize: metaSize, fontWeight: 'bold', marginBottom: '2px' }}>
                      {player.isIcon ? 'RETAINED' : `₹${player.soldPrice?.toLocaleString() || 0}`}
                    </div>
                    
                    <div style={{ color: '#ffffff', fontSize: contactSize, fontWeight: '800', opacity: 0.9, marginBottom: '2px' }}>
                      {player.mobile || player.phone || 'NO CONTACT'}
                    </div>

                    <div style={{ color: '#fbbf24', fontSize: contactSize, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.5px' }}>
                      {player.role || 'Player'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}

export default function TeamSquadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <TeamSquadContent />
    </Suspense>
  )
}
