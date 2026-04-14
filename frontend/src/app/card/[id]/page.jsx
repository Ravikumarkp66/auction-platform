"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Trophy, ShieldCheck, MapPin, Activity, User, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { API_URL } from "../../../lib/apiConfig";

export default function PublicPlayerCard() {
    const { id } = useParams();
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    const getImgUrl = (p) => {
        if (!p) return "/placeholder-player.png";
        const url = p.imageUrl || p.photo?.s3 || p.photo?.drive;
        if (!url) return "/placeholder-player.png";
        
        if (url.startsWith("/uploads")) {
           return `${API_URL}${url}`;
        }
        
        if (url.startsWith("http")) {
           return `${API_URL}/api/upload/proxy-image?url=${encodeURIComponent(url)}`;
        }
        
        return url;
    };

    const downloadAsImage = async () => {
        setIsDownloading(true);
        const element = document.getElementById("poster-canvas");
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, {
                useCORS: true,
                scale: 3, 
                backgroundColor: "#020617",
                logging: false,
                onclone: (doc) => {
                    // Universal Color Sanitizer - Resolves html2canvas v1.4.1 incompatibility with modern color spaces
                    const allElements = doc.getElementsByTagName("*");
                    const modernColorRegex = /okl(ch|ab)/i;
                    
                    for (let i = 0; i < allElements.length; i++) {
                        const el = allElements[i];
                        const style = window.getComputedStyle(el);
                        
                        // Sanitize standard color properties
                        if (modernColorRegex.test(style.color)) el.style.color = "#ffffff";
                        if (modernColorRegex.test(style.backgroundColor)) el.style.backgroundColor = "#1e1b4b"; // Indigo-950
                        if (modernColorRegex.test(style.borderColor)) el.style.borderColor = "#334155"; // Slate-700
                        
                        // Sanitize SVG specific properties which often trigger this error
                        if (modernColorRegex.test(style.fill)) el.style.fill = "#a855f7"; // Violet-500 fallback
                        if (modernColorRegex.test(style.stroke)) el.style.stroke = "#a855f7";
                        if (modernColorRegex.test(style.stopColor)) el.style.stopColor = "#a855f7";
                    }

                    const poster = doc.getElementById("poster-canvas");
                    if (poster) {
                        poster.style.color = "#ffffff";
                        poster.style.backgroundColor = "#0f172a";
                    }
                }
            });
            const data = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `${player.name}_Official_Poster.png`;
            link.href = data;
            link.click();
        } catch (err) {
            console.error("Poster export failed", err);
        } finally {
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        fetch(`${API_URL}/api/players/public/${id}`)
            .then(res => res.json())
            .then(data => {
                setPlayer(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-violet-400 font-black tracking-widest animate-pulse">GENERATING OFFICIAL POSTER...</div>;
    if (!player) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-red-400 font-black">RECORD NOT FOUND</div>;

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 sm:p-10 font-sans text-white overflow-hidden relative">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full animate-pulse delay-700" />

            <div className="max-w-md w-full relative">
                
                {/* ID Card Wrapper */}
                <div id="poster-canvas" className="bg-[#0f172a] rounded-[3rem] border border-white/10 shadow-2xl shadow-violet-500/10 overflow-hidden relative">
                    
                    {/* Header Branding - Cinematic Banner */}
                    <div className="h-80 bg-gradient-to-b from-violet-950 via-violet-900 to-transparent flex flex-col items-center justify-start pt-10 px-8 text-center relative overflow-hidden">
                        {/* Background Texture */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        
                        {/* VIBRANT STRIKE BRAND MARK */}
                        <div className="flex items-center gap-4 mb-8 relative z-10 bg-[#0f172a]/80 backdrop-blur-2xl px-8 py-3.5 rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                          <svg className="w-11 h-11" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M40 80L75 45" stroke="#A855F7" strokeWidth="12" strokeLinecap="round" />
                            <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="#A855F7" />
                            <path d="M45 45L80 80" stroke="white" strokeWidth="12" strokeLinecap="round" />
                            <circle cx="60" cy="60" r="10" fill="#FBBF24" />
                          </svg>
                          <div className="flex flex-col text-left border-l border-white/20 pl-4">
                            <span className="text-2xl font-[1000] tracking-tighter text-white leading-none uppercase">LAKSHMISH</span>
                            <span className="text-[10px] font-black tracking-[0.5em] uppercase text-violet-400 mt-1.5 opacity-90">Cricket Events</span>
                          </div>
                        </div>

                        {/* TOURNAMENT TITLE - BOLD & PROMINENT (Fit Optimized) */}
                        <div className="relative z-10 flex flex-col items-center mt-4">
                          <h1 className="text-4xl md:text-5xl font-[1000] text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(168,85,247,0.4)] leading-[0.9] text-center max-w-xs md:max-w-sm px-2">
                             {player?.tournamentName ? (
                                <span className="flex flex-col">
                                    <span className="text-white break-keep">{player.tournamentName.split(' ')[0]}</span>
                                    {player.tournamentName.split(' ').slice(1).join(' ') && (
                                        <span className="text-xl md:text-2xl font-black text-violet-400 mt-1">{player.tournamentName.split(' ').slice(1).join(' ')}</span>
                                    )}
                                </span>
                            ) : (
                                <span className="flex flex-col">
                                    <span className="text-white">PARAMESHWAR</span>
                                    <span className="text-xl md:text-2xl font-black text-violet-400 mt-1">CUP 2026</span>
                                </span>
                            )}
                          </h1>
                          <div className="flex items-center gap-3 mt-6">
                             <div className="h-px w-10 bg-gradient-to-r from-transparent to-violet-500/50" />
                             <p className="text-[11px] font-[1000] tracking-[0.5em] uppercase text-violet-300">
                               OFFICIAL PLAYER CARD
                             </p>
                             <div className="h-px w-10 bg-gradient-to-l from-transparent to-violet-500/50" />
                          </div>
                        </div>
                    </div>

                    {/* Image Section - Franchise Frame (Gap Refined) */}
                    <div className="relative -mt-4 mb-8 flex justify-center px-10 z-20">
                      <div className="relative group">
                        {/* Frame Radiance */}
                        <div className="absolute -inset-1 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-[3rem] blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                        
                        <div className="relative w-64 h-64 md:w-72 md:h-72 bg-[#0f172a] rounded-[2.5rem] overflow-hidden border-2 border-white/10 p-1 shadow-2xl">
                          <img 
                            src={getImgUrl(player)} 
                            crossOrigin="anonymous" 
                            onError={(e) => { e.currentTarget.src = '/placeholder-player.png'; }}
                            className="w-full h-full object-cover rounded-[2.3rem]" 
                          />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                        </div>
                      </div>
                    </div>

                    {/* Basic Info & Status */}
                    <div className="px-10 pb-12 text-center relative z-10">
                        <div className="mb-10 space-y-1">
                          <p className="text-[11px] font-black text-violet-400 uppercase tracking-[0.3em] mb-3">Accepted Candidate</p>
                          <h3 className="text-4xl md:text-5xl font-[1000] text-white uppercase italic tracking-tighter leading-none drop-shadow-2xl">
                            {player.name}
                          </h3>
                          <div className="flex items-center justify-center gap-3 mt-4">
                            <div className="h-[1px] w-8 bg-white/10" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">ID #{player.applicationId || player.shortId}</span>
                            <div className="h-[1px] w-8 bg-white/10" />
                          </div>
                        </div>

                        {/* Status Grid - Professional Scouting Profile */}
                        <div className="w-full grid grid-cols-2 gap-3 pb-8 border-b border-white/5">
                            <div className="flex flex-col items-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">Playing Role</span>
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{player.role || "All-Rounder"}</span>
                            </div>
                            <div className="flex flex-col items-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">Base Value</span>
                                <span className="text-xs font-[1000] text-emerald-400">₹{player.basePrice || "100"}</span>
                            </div>
                            
                            {/* NEW: Extended Scouting Attributes */}
                            <div className="flex flex-col items-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">Batting Style</span>
                                <span className="text-[10px] font-black text-violet-300 uppercase tracking-tighter truncate w-full px-2">{player.battingStyle || "Right Hand"}</span>
                            </div>
                            <div className="flex flex-col items-center p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 opacity-60">Bowling Style</span>
                                <span className="text-[10px] font-black text-violet-300 uppercase tracking-tighter truncate w-full px-2">{player.bowlingStyle || "Right Arm Fast"}</span>
                            </div>

                            <div className="col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 transition-all hover:bg-white/[0.05]">
                                <div className="flex flex-col items-start px-2">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 opacity-60">Village / Ward</span>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase">{player.village || "Local Ward"}</span>
                                </div>
                                <div className="h-8 w-px bg-white/10 mx-4" />
                                <div className="flex flex-col items-end px-2 text-right">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 opacity-60">Taluk / Town</span>
                                    <span className="text-[10px] font-black text-white/80 uppercase truncate max-w-[120px]">{player.taluk || "Regional Sector"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Registry Footer */}
                        <div className="pt-8 opacity-40">
                           <p className="text-[8px] font-black text-[#475569] uppercase tracking-[0.4em] leading-relaxed">
                              OFFICIAL TOURNAMENT REGISTRY PORTAL <br/>
                              © 2026 PARMESHWAR CUP • ALL RIGHTS RESERVED
                           </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions (Public) */}
                <div className="mt-10 flex flex-col items-center gap-6">
                    <button 
                      onClick={downloadAsImage}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isDownloading ? <Activity className="w-5 h-5 animate-pulse" /> : <Download className="w-5 h-5" />}
                        {isDownloading ? "CAPTURING OFFICIAL POSTER..." : "DOWNLOAD OFFICIAL POSTER (PNG)"}
                    </button>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> SYSTEM VERIFIED IDENTITY
                    </p>
                </div>
            </div>
            
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] grayscale bg-[url('https://www.transparenttextures.com/patterns/60-lines.png')]" />
        </div>
    );
}
