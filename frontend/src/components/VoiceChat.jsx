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
  const { isLive, volume, audioRef, joinVoiceRoom, changeVolume } =
    useVoiceChat(socket, roomId, false);

  // Auto-join room on mount
  const joined = useRef(false);
  if (socket && roomId && !joined.current) {
    joined.current = true;
    joinVoiceRoom();
  }

  return (
    <>
      {/* Hidden audio element — browser plays this automatically */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {isLive && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: "12px", padding: "8px 14px"
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#ef4444", boxShadow: "0 0 6px #ef4444",
            animation: "pulse 1.5s infinite", flexShrink: 0
          }} />
          <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>
            🔊 Auctioneer Live
          </span>

          {/* Volume slider */}
          <input
            id="voice-volume-slider"
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            style={{ width: 70, accentColor: "#ef4444", cursor: "pointer" }}
          />
          <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 28 }}>
            {Math.round(volume * 100)}%
          </span>

          <style>{`
            @keyframes pulse {
              0%,100% { opacity:1; }
              50% { opacity:0.4; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
