"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { io } from "socket.io-client";
import { ArrowLeft, Mic, MicOff, RefreshCw, Maximize2, Video, VideoOff, Radio } from "lucide-react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { API_URL } from "@/lib/apiConfig";

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function LiveBroadcastInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("id");
  const { data: session, status } = useSession();

  const [socket, setSocket] = useState(null);
  const [tournamentName, setTournamentName] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [landscapeLocked, setLandscapeLocked] = useState(false);
  const videoRef = useRef(null);

  const adminId = session?.user?.id ?? session?.user?.email ?? undefined;
  const isAdmin = session?.user?.role?.toLowerCase() === "admin";

  const {
    isLive,
    isBroadcaster,
    isMicMuted,
    isVideoMuted,
    facingMode,
    zoom,
    error,
    localStream,
    prepareCamera,
    publishLive,
    stopBroadcast,
    switchCamera,
    adjustZoom,
    toggleMic,
    toggleVideo,
  } = useVoiceChat(socket, tournamentId, true, adminId);

  // Auth
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace(tournamentId ? `/live-auction?id=${tournamentId}&role=admin` : "/auction");
    }
  }, [session, status, isAdmin, router, tournamentId]);

  // Socket (dedicated page — own connection; disconnect on leave)
  useEffect(() => {
    const socketUrl = API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    if (!socketUrl) return;
    const s = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 12,
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // Tournament label
  useEffect(() => {
    if (!tournamentId || !API_URL) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}`);
        if (!res.ok) throw new Error("Tournament not found");
        const json = await res.json();
        if (!cancelled && json?.tournament?.name) setTournamentName(json.tournament.name);
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "Could not load tournament");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  // Full-screen local preview — always the direct camera (not WebRTC loopback)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (localStream) {
      el.srcObject = localStream;
      el.play?.().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [localStream]);

  // Live timer once broadcasting
  useEffect(() => {
    if (!isBroadcaster || !isLive) {
      setLiveSeconds(0);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => setLiveSeconds(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isBroadcaster, isLive]);

  const handleLockLandscape = useCallback(async () => {
    try {
      const o = screen.orientation;
      if (o?.lock) {
        await o.lock("landscape");
        setLandscapeLocked(true);
      }
    } catch {
      setLandscapeLocked(false);
    }
  }, []);

  const handleEnd = useCallback(() => {
    stopBroadcast();
    if (tournamentId) router.push(`/live-auction?id=${tournamentId}&role=admin`);
    else router.push("/admin/dashboard");
  }, [stopBroadcast, router, tournamentId]);

  if (status === "loading" || (session && !isAdmin)) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-slate-400">
        Loading…
      </div>
    );
  }

  if (!tournamentId) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-slate-300">Missing tournament id. Open this page from the auction with ?id=…</p>
        <Link href="/admin/dashboard" className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">
          Dashboard
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-red-400">{loadError}</p>
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white">
          Go back
        </button>
      </div>
    );
  }

  const showCamera = !!localStream;
  const onAir = isBroadcaster && isLive;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/60 px-3 py-2 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={tournamentId ? `/live-auction?id=${tournamentId}&role=admin` : "/admin/dashboard"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
            aria-label="Back to auction"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-500">Broadcast</p>
            <p className="truncate text-sm font-bold text-white">{tournamentName || "Live auction"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onAir && (
            <div className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="text-xs font-black tracking-wide">LIVE</span>
              <span className="font-mono text-xs text-white/90">{formatDuration(liveSeconds)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Full-bleed camera (what you are shooting — local only) */}
      <div className="relative min-h-0 flex-1 bg-neutral-950">
        {showCamera ? (
          <video
            key={facingMode}
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <Radio className="mx-auto mb-4 h-14 w-14 text-violet-400" />
              <h1 className="text-xl font-black tracking-tight">Venue camera mode</h1>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Full-screen preview — same as your phone&apos;s camera. When you go live, viewers still see the small overlay on the auction screen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => prepareCamera()}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-4 text-lg font-black shadow-lg shadow-violet-900/40 active:scale-[0.98]"
            >
              Open camera
            </button>
            <button
              type="button"
              onClick={handleLockLandscape}
              className="text-xs font-bold uppercase tracking-widest text-slate-500 underline decoration-dotted underline-offset-4 hover:text-slate-300"
            >
              {landscapeLocked ? "Landscape locked" : "Lock landscape (recommended)"}
            </button>
          </div>
        )}

        {isVideoMuted && showCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75">
            <p className="text-sm font-bold text-slate-300">Video paused</p>
          </div>
        )}
      </div>

      {/* Bottom control dock — camera app style */}
      <footer className="shrink-0 border-t border-white/10 bg-gradient-to-t from-black via-black/95 to-black/80 px-4 pb-6 pt-3">
        {error && (
          <p className="mb-3 rounded-xl bg-red-500/20 px-3 py-2 text-center text-xs font-bold text-red-300">{error}</p>
        )}

        {!showCamera ? null : !onAir ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">You see exactly what will stream</p>
            <button
              type="button"
              onClick={() => {
                void handleLockLandscape();
                publishLive();
              }}
              className="w-full max-w-md rounded-2xl bg-gradient-to-r from-red-600 to-red-800 py-4 text-lg font-black tracking-wide shadow-lg shadow-red-900/50 active:scale-[0.99]"
            >
              START LIVE
            </button>
            <button type="button" onClick={() => prepareCamera()} className="text-xs font-bold text-slate-500 underline">
              Restart camera
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 text-xs font-black uppercase ${
                  isMicMuted ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white"
                }`}
              >
                {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                Mic
              </button>
              <button
                type="button"
                onClick={switchCamera}
                className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-xs font-black uppercase text-white"
              >
                <RefreshCw className="h-6 w-6" />
                {facingMode === "user" ? "Back" : "Front"}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 text-xs font-black uppercase ${
                  isVideoMuted ? "bg-sky-500/20 text-sky-300" : "bg-white/10 text-white"
                }`}
              >
                {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                Video
              </button>
              <button
                type="button"
                onClick={handleLockLandscape}
                className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-xs font-black uppercase text-white"
              >
                <Maximize2 className="h-6 w-6" />
                Wide
              </button>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Zoom</span>
                <span>{zoom.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={zoom}
                onChange={(e) => adjustZoom(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
            <button
              type="button"
              onClick={handleEnd}
              className="w-full rounded-2xl border-2 border-red-500/50 bg-red-950/40 py-4 text-sm font-black uppercase tracking-widest text-red-200"
            >
              End stream & return to auction
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

export default function LiveBroadcastPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black text-slate-400">Loading…</div>
      }
    >
      <LiveBroadcastInner />
    </Suspense>
  );
}
