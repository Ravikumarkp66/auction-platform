"use client";

import { useEffect, useRef, useState, use } from "react";
import io from "socket.io-client";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Camera, Radio, VideoOff, SwitchCamera, AlertTriangle, Battery, Signal, ArrowLeft, Mic, MicOff, RotateCcw } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MobileCameraPage({ params }) {
    const unwrappedParams = use(params);
    const matchId = unwrappedParams.matchId;

    const [socket, setSocket] = useState(null);
    const videoRef = useRef(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState("idle"); // idle, requesting, approved, denied

    // Orientation detection
    useEffect(() => {
        // matchMedia for robust mobile orientation detection
        const media = window.matchMedia("(orientation: landscape)");
        
        const handler = (e) => {
            // If it matches landscape, it's NOT portrait. 
            // Wait a few ms for Android viewport rendering to catch up.
            setTimeout(() => {
                setIsPortrait(!e.matches);
            }, 300);
        };

        // Initial check
        setIsPortrait(!media.matches);

        // Listen for changes
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

    // Hook into existing WebRTC Voice/Video engine using a dedicated camera room
    const {
        isLive,
        error,
        localStream,
        prepareCamera,
        publishLive,
        startBroadcast,
        stopBroadcast,
        switchCamera,
        restartCamera,
        facingMode,
        viewerCount
    } = useVoiceChat(socket, `${matchId}_camera`, true, "mobile-camera");

    // Initialize Socket.io and handle Approval Flow
    useEffect(() => {
        const s = io(API_URL, {
            transports: ["websocket", "polling"],
            withCredentials: true,
            forceNew: true,
        });
        setSocket(s);

        s.on("connect", () => {
            // We join the room but explicitly ask for permission
            s.emit("voice-join-room", { roomId: `${matchId}_camera` });
            
            const deviceInfo = navigator.userAgent;
            s.emit("camera-request-access", { roomId: `${matchId}_camera`, deviceInfo });
            setApprovalStatus("requesting");
        });

        s.on("camera-access-approved", () => {
            setApprovalStatus("approved");
        });

        s.on("camera-access-denied", () => {
            setApprovalStatus("denied");
            if (localStream) {
                stopBroadcast();
            }
        });

        return () => s.disconnect();
    }, [matchId, localStream, stopBroadcast]);

    // Automatically bind the localStream to the <video> element
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Restart camera on orientation change
    useEffect(() => {
        const handleOrientationChange = () => {
            if (localStream) {
                setTimeout(() => {
                    restartCamera(audioEnabled);
                }, 300);
            }
        };
        window.addEventListener("orientationchange", handleOrientationChange);
        return () => window.removeEventListener("orientationchange", handleOrientationChange);
    }, [localStream, audioEnabled, restartCamera]);

    // Cleanup when leaving page
    useEffect(() => {
        return () => {
            stopBroadcast();
        };
    }, [stopBroadcast]);

    const handleToggleStream = async () => {
        if (isLive) {
            stopBroadcast();
        } else {
            // Attempt to lock screen orientation to landscape upon user interaction
            try {
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock("landscape");
                }
            } catch (err) {
                console.warn("Screen orientation lock failed or not supported:", err);
            }
            startBroadcast(audioEnabled);
        }
    };

    const handleSwitchCamera = () => {
        switchCamera(audioEnabled);
    };

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans select-none">
            {/* Background Video Viewfinder */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-[100vw] h-[100vh] object-contain z-0"
                style={{
                    transform: facingMode === "user" ? "scaleX(-1)" : "none"
                }}
            />

            {/* PORTRAIT WARNING OVERLAY - Non-blocking floating warning */}
            {isPortrait && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-950/80 backdrop-blur-xl border border-red-500/50 px-5 py-3 rounded-full shadow-2xl animate-bounce">
                    <RotateCcw size={20} className="text-red-400" />
                    <p className="text-xs text-white font-bold uppercase tracking-widest whitespace-nowrap">
                        Rotate for better broadcast
                    </p>
                </div>
            )}

            {/* Dark gradient overlays for readability */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />

            {/* TOP BAR */}
            <div className="relative z-20 flex items-center justify-between p-4">
                <Link href={`/admin/sports/score/${matchId}`} className="p-2 bg-white/10 rounded-full backdrop-blur active:scale-95 transition-transform">
                    <ArrowLeft size={20} />
                </Link>

                <div className="flex items-center gap-4">
                    {/* Viewers */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10">
                        <span className="text-xs font-black text-slate-300">👁 {viewerCount}</span>
                    </div>

                    {/* LIVE Status */}
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur transition-all ${
                        isLive 
                            ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" 
                            : "bg-white/10 border-white/20 text-slate-300"
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500" : "bg-slate-400"}`} />
                        <span className="text-xs font-black uppercase tracking-widest">{isLive ? "LIVE" : "STANDBY"}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Battery size={20} className="text-slate-300 opacity-80" />
                    <Signal size={20} className="text-emerald-400" />
                </div>
            </div>

            {/* ERROR TOAST */}
            {error && (
                <div className="relative z-20 m-4 p-3 bg-red-950/80 border border-red-500 rounded-xl flex items-center gap-3 backdrop-blur shadow-xl">
                    <AlertTriangle size={20} className="text-red-400 shrink-0" />
                    <p className="text-xs font-black text-red-200">{error}</p>
                </div>
            )}

            {/* MIDDLE (Rotate hint & Approval UI) */}
            <div className="flex-1 relative z-20 flex flex-col items-center justify-center pointer-events-none p-6">
                
                {approvalStatus === "requesting" && (
                    <div className="text-center bg-black/80 backdrop-blur-xl p-8 rounded-[2rem] border border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.15)] max-w-sm w-full mx-auto">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Waiting for Host</h2>
                        <p className="text-xs text-blue-200/70 font-bold uppercase tracking-widest leading-relaxed">
                            Requesting permission to join broadcast as a camera source.
                        </p>
                    </div>
                )}

                {approvalStatus === "denied" && (
                    <div className="text-center bg-red-950/80 backdrop-blur-xl p-8 rounded-[2rem] border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)] max-w-sm w-full mx-auto">
                        <AlertTriangle size={48} className="mx-auto text-red-500 mb-6" />
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-red-400 mb-2">Access Denied</h2>
                        <p className="text-xs text-red-200/70 font-bold uppercase tracking-widest leading-relaxed">
                            The admin has rejected your broadcast request.
                        </p>
                    </div>
                )}

                {approvalStatus === "approved" && !isLive && !localStream && (
                    <div className="text-center bg-black/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl max-w-sm w-full mx-auto pointer-events-auto">
                        <Camera size={48} className="mx-auto text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Host Approved</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                            Mount phone on tripod in landscape mode before starting broadcast.
                        </p>
                        <p className="text-[10px] text-amber-400/80 font-black uppercase tracking-widest p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            Browser will ask for camera permission when you press Start.
                        </p>
                    </div>
                )}
            </div>

            {/* BOTTOM BAR CONTROLS */}
            {approvalStatus === "approved" && (
                <div className="relative z-20 p-6 flex flex-col items-center pb-8">
                    
                    {/* Main Action Button */}
                    <button
                        onClick={handleToggleStream}
                        className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 transition-all active:scale-95 ${
                            isLive 
                                ? "bg-transparent border-red-500 hover:bg-red-500/10" 
                                : "bg-white border-slate-300 hover:bg-slate-200"
                        }`}
                    >
                        <div className={`rounded-sm transition-all ${
                            isLive ? "w-6 h-6 bg-red-500" : "w-16 h-16 bg-transparent rounded-full"
                        }`} />
                    </button>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        {isLive ? "Stop Broadcast" : "Start Broadcast"}
                    </p>

                    {/* Auxiliary Controls */}
                    <div className="absolute right-8 bottom-10 flex gap-4">
                        <button 
                            onClick={() => {
                                setAudioEnabled(!audioEnabled);
                            }}
                            className={`p-4 border backdrop-blur rounded-full transition-colors active:scale-95 ${
                                audioEnabled ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                            }`}
                        >
                            {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>
                        <button 
                            onClick={handleSwitchCamera}
                            className="p-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur rounded-full transition-colors active:scale-95"
                        >
                            <SwitchCamera size={24} className="text-white" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
