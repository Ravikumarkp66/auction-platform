"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";

const DEFAULT_ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
};

/** Production: remote SDP often omits streams[]; without this, video srcObject stays null. */
function streamFromTrackEvent(e) {
  const s = e.streams?.[0];
  if (s) return s;
  return new MediaStream([e.track]);
}

function buildRtcConfiguration() {
  const raw =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WEBRTC_ICE_JSON : undefined;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length)
        return { iceServers: parsed, iceTransportPolicy: "all" };
      if (parsed?.iceServers?.length)
        return {
          iceServers: parsed.iceServers,
          iceTransportPolicy: parsed.iceTransportPolicy || "all",
        };
    } catch {
      console.warn("[VoiceChat] Invalid NEXT_PUBLIC_WEBRTC_ICE_JSON");
    }
  }
  const forceRelay =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_WEBRTC_FORCE_RELAY === "1";
  return {
    ...DEFAULT_ICE,
    iceTransportPolicy: forceRelay ? "relay" : "all",
  };
}

export function useVoiceChat(socket, roomId, isAdmin, adminId) {
  const rtcConfig = useMemo(() => buildRtcConfiguration(), []);
  const voiceRoomId = roomId != null && roomId !== "" ? String(roomId) : null;
  const voiceRoomIdRef = useRef(voiceRoomId);
  useEffect(() => {
    voiceRoomIdRef.current = voiceRoomId;
  }, [voiceRoomId]);
  // ─── UI State ─────────────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [broadcasterId, setBroadcasterId] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState(1);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState(null);
  /** Same tracks as localStreamRef — state so consumers can render preview without reading refs in render */
  const [localStream, setLocalStream] = useState(null);

  // ─── Refs (avoid stale closures in socket callbacks) ──────────────────────
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioRef = useRef(null);
  const videoTrackRef = useRef(null);
  const isBroadcasterRef = useRef(false);   // source of truth for callbacks
  const volumeRef = useRef(1);

  // Keep refs in sync with state
  useEffect(() => { isBroadcasterRef.current = isBroadcaster; }, [isBroadcaster]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // ─── Peer factory ─────────────────────────────────────────────────────────
  const createPeer = useCallback((viewerId) => {
    const peer = new RTCPeerConnection(rtcConfig);

    peer.onicecandidate = (e) => {
      if (e.candidate && socket)
        socket.emit("voice-ice-candidate", { candidate: e.candidate, to: viewerId });
    };

    peer.onconnectionstatechange = () => {
      const st = peer.connectionState;
      if (st === "failed" || st === "closed") {
        console.warn("[VoiceChat] Peer connection ended:", st, viewerId);
        peer.close();
        delete peersRef.current[viewerId];
        setViewerCount(Object.keys(peersRef.current).length);
        // Viewer: ask broadcaster for a fresh offer (common on mobile / NAT)
        if (st === "failed" && !isBroadcasterRef.current && socket?.connected && voiceRoomIdRef.current) {
          setTimeout(() => {
            socket.emit("voice-request-offer", { to: voiceRoomIdRef.current });
          }, 400);
        }
      }
    };

    return peer;
  }, [socket, rtcConfig]); // No isBroadcaster dependency — uses ref instead

  // ─── Admin: offer one viewer ───────────────────────────────────────────────
  const offerViewer = useCallback(async (viewerId) => {
    if (!localStreamRef.current) {
      console.warn("[VoiceChat] offerViewer called but no local stream yet");
      return;
    }
    console.log("[VoiceChat] Offering viewer:", viewerId);

    let peer = peersRef.current[viewerId];
    if (!peer) {
      peer = createPeer(viewerId);
      peersRef.current[viewerId] = peer;
    }

    // Add all tracks (no onnegotiationneeded handler — it raced createOffer on mobile)
    localStreamRef.current.getTracks().forEach((track) => {
      const alreadyAdded = peer.getSenders().find((s) => s.track === track);
      if (!alreadyAdded) peer.addTrack(track, localStreamRef.current);
    });

    await Promise.resolve();

    // Explicit createOffer (single code path — avoids glare with negotiationneeded)
    try {
      if (peer.signalingState !== "stable") return;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("voice-offer", { offer, to: viewerId });
      setViewerCount(Object.keys(peersRef.current).length);
    } catch (err) {
      console.error("[VoiceChat] offerViewer error:", err);
    }
  }, [createPeer, socket]);

  // ─── Admin: offer ALL current room members (called after stream ready) ────
  const offerAllViewers = useCallback(async () => {
    if (!socket || !voiceRoomId) return;
    // Re-query room — server will respond with voice-room-viewers
    socket.emit("voice-join-room", { roomId: voiceRoomId });
  }, [socket, voiceRoomId]);

  // ─── Camera: open mic + camera only (no socket publish) — for full-screen mobile prep UI
  const prepareCamera = useCallback(async () => {
    if (!voiceRoomId) {
      setError("Missing tournament for broadcast.");
      return;
    }
    setError(null);
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        videoTrackRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      videoTrackRef.current = stream.getVideoTracks()[0] || null;
    } catch (err) {
      console.error("[VoiceChat] getUserMedia error:", err);
      setError("Camera/Mic access denied. Please allow permissions.");
    }
  }, [voiceRoomId, facingMode]);

  // ─── Publish: announce live to room (expects prepareCamera already done) ─
  const publishLive = useCallback(() => {
    if (!socket || !voiceRoomId) return;
    if (!localStreamRef.current) {
      setError("Open the camera first.");
      return;
    }
    setError(null);
    socket.emit("voice-start-broadcast", { roomId: voiceRoomId, adminId });
  }, [socket, voiceRoomId, adminId]);

  // ─── Broadcast: one-tap (camera + go live) — desktop / embedded admin bar ─
  const startBroadcast = useCallback(async () => {
    if (!socket || !voiceRoomId) return;
    await prepareCamera();
    if (localStreamRef.current) publishLive();
  }, [socket, voiceRoomId, prepareCamera, publishLive]);

  // ─── Broadcast: Stop ──────────────────────────────────────────────────────
  const stopBroadcast = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    videoTrackRef.current = null;
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};
    isBroadcasterRef.current = false;
    setViewerCount(0);
    setIsLive(false);
    setIsVideoLive(false);
    setIsBroadcaster(false);
    socket?.emit("voice-stop-broadcast", { roomId: voiceRoomId });
  }, [socket, voiceRoomId]);

  // ─── Camera Switch (seamless via replaceTrack) ────────────────────────────
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Seamlessly replace in all peer connections — no reconnect
      for (const peer of Object.values(peersRef.current)) {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(newTrack);
      }

      if (videoTrackRef.current) videoTrackRef.current.stop();
      localStreamRef.current.removeTrack(videoTrackRef.current);
      localStreamRef.current.addTrack(newTrack);
      videoTrackRef.current = newTrack;
      setFacingMode(newMode);
      setZoom(1);
    } catch (err) {
      console.error("[VoiceChat] Switch camera error:", err);
      setError("Could not switch camera.");
    }
  }, [facingMode]);

  // ─── Zoom ─────────────────────────────────────────────────────────────────
  const adjustZoom = useCallback(async (value) => {
    if (!videoTrackRef.current) return;
    try {
      await videoTrackRef.current.applyConstraints({ advanced: [{ zoom: value }] });
      setZoom(value);
    } catch (_) {
      // Zoom not supported on this device — silently ignore
    }
  }, []);

  // ─── Mic / Video mute ─────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMicMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!videoTrackRef.current) return;
    videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
    setIsVideoMuted((v) => !v);
  }, []);

  // ─── Viewer: reset ────────────────────────────────────────────────────────
  const resetViewerState = useCallback(() => {
    if (audioRef.current) audioRef.current.srcObject = null;
    setRemoteVideoStream(null);
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};
    setIsLive(false);
  }, []);

  // ─── Volume ───────────────────────────────────────────────────────────────
  const changeVolume = useCallback((val) => {
    setVolume(val);
    volumeRef.current = val;
    if (audioRef.current) audioRef.current.volume = val;
  }, []);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !voiceRoomId) return;

    // Shared: broadcast status update (admin + viewer)
    const onBroadcasterUpdate = ({ isLive: serverLive, broadcasterId: bId, broadcasterSocketId }) => {
      console.log("[VoiceChat] broadcaster-update:", { serverLive, bId, broadcasterSocketId, myId: socket.id });
      setIsLive(serverLive);
      setBroadcasterId(bId ?? null);

      if (serverLive && broadcasterSocketId === socket.id) {
        // WE are confirmed as broadcaster — now offer all viewers in room
        isBroadcasterRef.current = true;
        setIsBroadcaster(true);
        setIsVideoLive(true);
        // Re-emit join so server returns current viewers list
        socket.emit("voice-join-room", { roomId: voiceRoomId });
      } else {
        isBroadcasterRef.current = false;
        setIsBroadcaster(false);
        if (!serverLive) resetViewerState();
        else if (!isAdmin && voiceRoomId) {
          // Viewer: broadcaster just went live — prompt offer immediately (interval is 6s otherwise)
          socket.emit("voice-request-offer", { to: voiceRoomId });
        }
      }
    };

    const onVoiceError = ({ message }) => setError(message);

    socket.on("voice-broadcaster-update", onBroadcasterUpdate);
    socket.on("voice-error", onVoiceError);

    if (isAdmin) {
      // ── ADMIN listeners ────────────────────────────────────────────────────
      const onRoomViewers = ({ viewers }) => {
        // Only offer if WE are the broadcaster (check ref for freshness)
        if (!isBroadcasterRef.current) return;
        console.log("[VoiceChat] Room viewers to offer:", viewers);
        viewers.forEach((id) => offerViewer(id));
      };

      const onViewerJoined = ({ viewerId }) => {
        if (!isBroadcasterRef.current) return;
        console.log("[VoiceChat] New viewer joined:", viewerId);
        offerViewer(viewerId);
      };

      const onOfferRequest = ({ from }) => {
        if (!isBroadcasterRef.current) return;
        offerViewer(from);
      };

      const onAnswer = async ({ answer, from }) => {
        const peer = peersRef.current[from];
        if (peer) {
          try {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("[VoiceChat] setRemoteDescription error:", err);
          }
        }
      };

      const onIce = async ({ candidate, from }) => {
        const peer = peersRef.current[from];
        if (peer) {
          try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
        }
      };

      socket.on("voice-room-viewers", onRoomViewers);
      socket.on("voice-viewer-joined", onViewerJoined);
      socket.on("voice-request-offer", onOfferRequest);
      socket.on("voice-answer", onAnswer);
      socket.on("voice-ice-candidate", onIce);

      return () => {
        socket.off("voice-broadcaster-update", onBroadcasterUpdate);
        socket.off("voice-error", onVoiceError);
        socket.off("voice-room-viewers", onRoomViewers);
        socket.off("voice-viewer-joined", onViewerJoined);
        socket.off("voice-request-offer", onOfferRequest);
        socket.off("voice-answer", onAnswer);
        socket.off("voice-ice-candidate", onIce);
      };
    }

    // ── VIEWER listeners ───────────────────────────────────────────────────
    const onOffer = async ({ offer, from }) => {
      console.log("[VoiceChat] Viewer received offer from:", from);
      let peer = peersRef.current[from];

      if (peer && peer.signalingState !== "stable") {
        console.warn("[VoiceChat] Replacing peer — state was:", peer.signalingState);
        peer.close();
        delete peersRef.current[from];
        peer = null;
      }

      if (!peer) {
        peer = createPeer(from);
        peersRef.current[from] = peer;

        peer.ontrack = (e) => {
          console.log("[VoiceChat] Track received:", e.track.kind);
          const stream = streamFromTrackEvent(e);
          if (e.track.kind === "audio") {
            if (audioRef.current) {
              audioRef.current.srcObject = stream;
              audioRef.current.volume = volumeRef.current;
              audioRef.current.play?.().catch(() => {});
            }
          } else if (e.track.kind === "video") {
            setRemoteVideoStream(stream);
            e.track.onended = () => setRemoteVideoStream(null);
          }
          setIsLive(true);
        };
      }

      if (peer.signalingState !== "stable") {
        console.warn("[VoiceChat] Skipping offer — state:", peer.signalingState);
        return;
      }

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("voice-answer", { answer, to: from });
      } catch (err) {
        console.error("[VoiceChat] Answer error:", err);
      }
    };

    const onIceViewer = async ({ candidate, from }) => {
      const peer = peersRef.current[from];
      if (peer) try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
    };

    socket.on("voice-offer", onOffer);
    socket.on("voice-ice-candidate", onIceViewer);
    socket.on("voice-stopped", resetViewerState);

    return () => {
      socket.off("voice-broadcaster-update", onBroadcasterUpdate);
      socket.off("voice-error", onVoiceError);
      socket.off("voice-offer", onOffer);
      socket.off("voice-ice-candidate", onIceViewer);
      socket.off("voice-stopped", resetViewerState);
    };
  }, [socket, voiceRoomId, isAdmin, createPeer, offerViewer, resetViewerState]);

  // ─── Join room on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (socket && voiceRoomId) {
      console.log("[VoiceChat] Joining room:", voiceRoomId);
      socket.emit("voice-join-room", { roomId: voiceRoomId });
    }
    return () => {
      if (!isAdmin) resetViewerState();
    };
  }, [socket, voiceRoomId, isAdmin, resetViewerState]);

  // ─── Viewer: nudge admin periodically if not yet live ─────────────────────
  useEffect(() => {
    if (isAdmin || !socket || !voiceRoomId || isLive) return;
    const timer = setInterval(() => {
      if (!isLive) socket.emit("voice-request-offer", { to: voiceRoomId });
    }, 6000);
    return () => clearInterval(timer);
  }, [isAdmin, socket, voiceRoomId, isLive]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isAdmin) stopBroadcast();
    };
  }, []); // eslint-disable-line

  return {
    isLive, isVideoLive, isMicMuted, isVideoMuted,
    isBroadcaster, broadcasterId,
    facingMode, zoom, volume,
    viewerCount, error,
    audioRef,
    localStream,
    remoteVideoStream,
    prepareCamera,
    publishLive,
    startBroadcast, stopBroadcast,
    switchCamera, adjustZoom,
    toggleMic, toggleVideo,
    changeVolume,
  };
}
