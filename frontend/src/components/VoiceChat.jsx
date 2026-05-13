"use client";
import { useRef, useEffect, useState } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";

/* ────────────────────────────────────────────────────────────────────────────
   VoiceChatAdmin  — show on live-auction (admin) page
──────────────────────────────────────────────────────────────────────────── */
export function VoiceChatAdmin({ socket, roomId, currentAdminId }) {
  const { 
    isLive, 
    isBroadcaster,
    broadcasterId,
    isMicMuted,
    isVideoMuted,
    facingMode,
    zoom,
    error, 
    localStream,
    startBroadcast, 
    stopBroadcast, 
    switchCamera,
    adjustZoom,
    toggleMic,
    toggleVideo 
  } = useVoiceChat(socket, roomId, true, currentAdminId);

  const localVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream && isBroadcaster) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isBroadcaster]);

  const isAnotherAdminLive = isLive && !isBroadcaster;

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "15px" }}>
      
      {/* 📺 BROADCASTER CONTROL PANEL (Floating) */}
      {isBroadcaster && (
        <div style={{
          width: "280px",
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: "20px",
          padding: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          animation: "panelIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ color: "#60a5fa", fontSize: "12px", fontWeight: "900", letterSpacing: "0.1em" }}>LIVE CONTROL PANEL</span>
            <div style={{ width: 8, height: 8, background: "#ef4444", borderRadius: "50%", animation: "pulse 1s infinite" }} />
          </div>

          {/* Local Preview Area */}
          <div style={{ 
            width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "12px", 
            overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {isVideoMuted && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}>VIDEO PAUSED</span>
              </div>
            )}
          </div>

          {/* Main Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button onClick={toggleMic} style={controlBtnStyle(isMicMuted, "#eab308")}>
              {isMicMuted ? "🎙️ Unmute Mic" : "🎙️ Mute Mic"}
            </button>
            <button onClick={toggleVideo} style={controlBtnStyle(isVideoMuted, "#3b82f6")}>
              {isVideoMuted ? "📹 Start Video" : "📹 Stop Video"}
            </button>
            <button onClick={switchCamera} style={controlBtnStyle(false, "#6366f1")}>
              🔄 {facingMode === "user" ? "Back Cam" : "Front Cam"}
            </button>
            <button onClick={stopBroadcast} style={controlBtnStyle(false, "#ef4444")}>
              ⛔ Stop Stream
            </button>
          </div>

          {/* Zoom Slider */}
          <div style={{ marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}>ZOOM LEVEL</span>
              <span style={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}>{zoom}x</span>
            </div>
            <input 
              type="range" min="1" max="5" step="0.1" value={zoom} 
              onChange={(e) => adjustZoom(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#60a5fa", cursor: "pointer" }}
            />
          </div>
        </div>
      )}

      {/* 🚀 ADMIN STATUS BAR */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        background: "rgba(15, 15, 15, 0.7)", backdropFilter: "blur(14px)",
        border: `1px solid ${isLive ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
        borderRadius: "16px", padding: "10px 20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
      }}>
        {isAnotherAdminLive ? (
          <>
             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 8, height: 8, background: "#ef4444", borderRadius: "50%", animation: "pulse 1s infinite" }} />
                <span style={{ color: "#ef4444", fontWeight: "800", fontSize: "11px", letterSpacing: "0.05em" }}>
                  ADMIN {broadcasterId?.slice(-4).toUpperCase()} IS LIVE
                </span>
             </div>
             <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)" }} />
             <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600" }}>Stream is locked</span>
          </>
        ) : !isBroadcaster ? (
          <button
            onClick={startBroadcast}
            style={{
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              border: "none", borderRadius: "10px",
              color: "#fff", fontWeight: "800", fontSize: "12px",
              padding: "8px 20px", cursor: "pointer",
              boxShadow: "0 5px 15px rgba(239, 68, 68, 0.3)",
              transition: "transform 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            🚀 START LIVE BROADCAST
          </button>
        ) : (
           <span style={{ color: "#4ade80", fontWeight: "900", fontSize: "11px", letterSpacing: "0.1em" }}>
             ● YOU ARE BROADCASTING
           </span>
        )}
      </div>

      {error && (
        <div style={{ 
          background: "rgba(239, 68, 68, 0.9)", color: "#fff", 
          padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold"
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes panelIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}

const controlBtnStyle = (isActive, color) => ({
  background: isActive ? `${color}22` : "rgba(255,255,255,0.06)",
  border: `1px solid ${isActive ? color : "rgba(255,255,255,0.15)"}`,
  borderRadius: "10px",
  color: isActive ? color : "#e2e8f0",
  fontSize: "11px",
  fontWeight: "700",
  padding: "8px 4px",
  cursor: "pointer",
  transition: "all 0.2s"
});

/* ────────────────────────────────────────────────────────────────────────────
   VoiceChatViewer — show on overlay / public pages
──────────────────────────────────────────────────────────────────────────── */
export function VoiceChatViewer({ socket, roomId }) {
  const { isLive, volume, audioRef, remoteVideoStream, changeVolume } =
    useVoiceChat(socket, roomId, false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !remoteVideoStream) return;
    el.srcObject = remoteVideoStream;
    el.play?.().catch(() => {});
  }, [remoteVideoStream]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  if (!socket || !roomId) return null;

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {remoteVideoStream && (
        <div 
          ref={containerRef}
          style={{
            position: "fixed",
            bottom: isFullscreen ? "0" : "24px",
            right: isFullscreen ? "0" : "24px",
            width: isFullscreen ? "100vw" : "240px",
            height: isFullscreen ? "100vh" : "135px",
            background: isFullscreen ? "#000" : "rgba(8,8,8,0.55)",
            backdropFilter: isFullscreen ? "none" : "blur(14px)",
            borderRadius: isFullscreen ? "0" : "18px",
            overflow: "hidden",
            boxShadow: isFullscreen ? "none" : "0 8px 30px rgba(0,0,0,0.45)",
            zIndex: 500001,
            border: isFullscreen ? "none" : "1px solid rgba(255, 0, 0, 0.2)",
            animation: "broadcastIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex", flexDirection: "column"
          }}
        >
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: isFullscreen ? "contain" : "cover", background: "#111" }} />
          {!isFullscreen && (
            <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
              <div style={{ background: "rgba(255, 0, 0, 0.15)", backdropFilter: "blur(8px)", color: "#ff4d4d", fontSize: "11px", fontWeight: "800", padding: "4px 10px", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "5px", border: "1px solid rgba(255,0,0,0.2)" }}>
                <span style={{ width: 6, height: 6, background: "#ff4d4d", borderRadius: "50%", animation: "pulse 1s infinite" }} />
                LIVE <span style={{ opacity: 0.6, margin: "0 2px" }}>|</span> AUCTIONEER
              </div>
              <div style={{ background: "rgba(0, 255, 0, 0.15)", backdropFilter: "blur(8px)", color: "#4ade80", fontSize: "10px", fontWeight: "900", padding: "3px 8px", borderRadius: "999px", border: "1px solid rgba(74, 222, 128, 0.2)" }}>HD</div>
            </div>
          )}
          <button onClick={toggleFullscreen} style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "white", padding: "4px", cursor: "pointer", backdropFilter: "blur(4px)", opacity: 0.7 }}>
            {isFullscreen ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>}
          </button>
        </div>
      )}

      {/* 🔊 Global Audio Control */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        background: "rgba(10, 10, 10, 0.75)", backdropFilter: "blur(20px)",
        border: `1px solid ${isLive ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.1)"}`,
        borderRadius: "16px", padding: "10px 18px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        transition: "all 0.4s", position: "relative", zIndex: 500002
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLive ? "#ef4444" : "#475569", boxShadow: isLive ? "0 0 12px #ef4444" : "none", animation: isLive ? "pulse 1.5s infinite" : "none" }} />
        <span style={{ color: isLive ? "#f1f5f9" : "#94a3b8", fontSize: "11px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {isLive ? "LIVE BROADCAST" : "SIGNAL READY"}
        </span>
        {isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "8px", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "14px" }}>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} style={{ width: 70, accentColor: "#ef4444" }} />
            <span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: "800", minWidth: "28px", fontFamily: "monospace" }}>{Math.round(volume * 100)}%</span>
          </div>
        )}
      </div>

      <style>{` @keyframes broadcastIn { from { opacity: 0; transform: scale(0.9) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } } `}</style>
    </>
  );
}
