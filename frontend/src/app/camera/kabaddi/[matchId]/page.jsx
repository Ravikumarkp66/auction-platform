"use client";

import { useEffect, useRef, useState, use } from "react";
import io from "socket.io-client";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Camera, Radio, VideoOff, SwitchCamera, AlertTriangle, Battery, Signal, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MobileCameraPage({ params }) {
    const unwrappedParams = use(params);
    const matchId = unwrappedParams.matchId;

    const [socket, setSocket] = useState(null);
    const videoRef = useRef(null);

    // Initialize Socket.io
    useEffect(() => {
        const s = io(API_URL, {
            transports: ["websocket", "polling"],
            withCredentials: true,
            forceNew: true,
        });
        setSocket(s);
        return () => s.disconnect();
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
        facingMode,
        viewerCount
    } = useVoiceChat(socket, `${matchId}_camera`, true, "mobile-camera");

    // Automatically bind the localStream to the <video> element
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Cleanup when leaving page
    useEffect(() => {
        return () => {
            stopBroadcast();
        };
    }, [stopBroadcast]);

    const handleToggleStream = () => {
        if (isLive) {
            stopBroadcast();
        } else {
            startBroadcast();
        }
    };

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans select-none">
            {/* Background Video Viewfinder */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{
                    transform: facingMode === "user" ? "scaleX(-1)" : "none"
                }}
            />

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

            {/* MIDDLE (Rotate hint) */}
            <div className="flex-1 relative z-20 flex items-center justify-center pointer-events-none">
                {!isLive && !localStream && (
                    <div className="text-center bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                        <Camera size={48} className="mx-auto text-slate-400 mb-4 opacity-50" />
                        <h2 className="text-lg font-black uppercase tracking-widest text-white mb-2">Camera Ready</h2>
                        <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto uppercase tracking-wider">
                            Mount phone on tripod in landscape mode before starting broadcast.
                        </p>
                    </div>
                )}
            </div>

            {/* BOTTOM BAR CONTROLS */}
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
                        onClick={switchCamera}
                        className="p-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur rounded-full transition-colors active:scale-95"
                    >
                        <SwitchCamera size={24} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
