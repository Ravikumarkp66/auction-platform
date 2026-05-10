"use client";
import { useRef } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";

/* ────────────────────────────────────────────────────────────────────────────
   VoiceChatAdmin  — show on live-auction (admin) page
   Usage:
     <VoiceChatAdmin socket={socket} roomId={tournamentId} />
──────────────────────────────────────────────────────────────────────────── */
export function VoiceChatAdmin({ socket, roomId }) {
  const { isLive, isMuted, viewerCount, error, startVoice, stopVoice, toggleMute } =
    useVoiceChat(socket, roomId, true);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
      border: `1px solid ${isLive ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
      borderRadius: "12px", padding: "8px 14px",
      transition: "border-color 0.3s"
    }}>
      {/* Status dot */}
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: isLive ? "#ef4444" : "#6b7280",
        boxShadow: isLive ? "0 0 8px #ef4444" : "none",
        animation: isLive ? "pulse 1.5s infinite" : "none",
        flexShrink: 0
      }} />

      {!isLive ? (
        <button
          id="voice-go-live-btn"
          onClick={startVoice}
          style={{
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            border: "none", borderRadius: "8px",
            color: "#fff", fontWeight: 700, fontSize: 13,
            padding: "6px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6
          }}
        >
          🎤 Go Live
        </button>
      ) : (
        <>
          <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>
            🔴 LIVE
          </span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            {viewerCount} listener{viewerCount !== 1 ? "s" : ""}
          </span>
          <button
            id="voice-mute-btn"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            style={{
              background: isMuted ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.1)",
              border: `1px solid ${isMuted ? "#eab308" : "rgba(255,255,255,0.2)"}`,
              borderRadius: "8px", color: isMuted ? "#eab308" : "#e2e8f0",
              fontSize: 13, padding: "4px 10px", cursor: "pointer"
            }}
          >
            {isMuted ? "🔇 Muted" : "🎙️ Mic On"}
          </button>
          <button
            id="voice-stop-btn"
            onClick={stopVoice}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "8px", color: "#ef4444",
              fontSize: 13, padding: "4px 10px", cursor: "pointer"
            }}
          >
            ⛔ Stop
          </button>
        </>
      )}

      {error && (
        <span style={{ color: "#f87171", fontSize: 11 }}>{error}</span>
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50% { opacity:0.4; }
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   VoiceChatViewer — show on overlay / public pages
   Usage:
     <VoiceChatViewer socket={socket} roomId={tournamentId} />
──────────────────────────────────────────────────────────────────────────── */
export function VoiceChatViewer({ socket, roomId }) {
  const { isLive, volume, audioRef, changeVolume } =
    useVoiceChat(socket, roomId, false);

  if (!socket || !roomId) return null;

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
        border: `1px solid ${isLive ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "14px", padding: "10px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease"
      }}>
        {/* Status indicator */}
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: isLive ? "#ef4444" : "#64748b",
          boxShadow: isLive ? "0 0 10px #ef4444" : "none",
          animation: isLive ? "pulse 1.5s infinite" : "none",
          flexShrink: 0
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {isLive ? "🔊 Auctioneer Live" : "🎙️ Voice Ready"}
          </span>
          {!isLive && (
            <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 500 }}>
              Waiting for broadcast...
            </span>
          )}
        </div>

        {isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "4px", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "12px" }}>
            <input
              id="voice-volume-slider"
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              style={{ width: 80, accentColor: "#ef4444", cursor: "pointer" }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, minWidth: 30, fontFamily: "monospace" }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.9); }
          }
        `}</style>
      </div>
    </>
  );
}
