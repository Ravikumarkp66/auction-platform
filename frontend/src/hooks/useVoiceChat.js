"use client";
import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

/**
 * useVoiceChat — WebRTC one-way voice broadcast hook
 *
 * Admin mode:  isAdmin=true  → captures mic, pushes audio to all viewers
 * Viewer mode: isAdmin=false → receives audio stream from admin
 *
 * @param {object} socket  — existing socket.io socket instance
 * @param {string} roomId  — unique room id (e.g. tournamentId)
 * @param {boolean} isAdmin
 */
export function useVoiceChat(socket, roomId, isAdmin) {
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);     // admin mic stream
  const peersRef = useRef({});             // { socketId: RTCPeerConnection }
  const audioRef = useRef(null);           // viewer <audio> element

  // ─── helpers ───────────────────────────────────────────────────────────────
  const createPeer = useCallback((viewerId) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    // Send ICE candidates to the other side
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("voice-ice-candidate", { candidate: e.candidate, to: viewerId });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        peer.close();
        delete peersRef.current[viewerId];
        setViewerCount(Object.keys(peersRef.current).length);
      }
    };

    return peer;
  }, [socket]);

  // ─── ADMIN: start broadcasting ─────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    if (!socket || !roomId) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;

      // Join room — server responds with current viewer list
      socket.emit("voice-join-room", { roomId });
      setIsLive(true);
    } catch (err) {
      setError("Microphone access denied. Please allow mic permission.");
      console.error("[VoiceChat] Mic error:", err);
    }
  }, [socket, roomId]);

  // ─── ADMIN: stop broadcasting ──────────────────────────────────────────────
  const stopVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};
    setViewerCount(0);
    setIsLive(false);
    socket?.emit("voice-stop", { roomId });
  }, [socket, roomId]);

  // ─── ADMIN: mute toggle ────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted; // flip: if currently muted, enable
      });
      setIsMuted((m) => !m);
    }
  }, [isMuted]);

  // ─── VIEWER: reset state ──────────────────────────────────────────────────
  const resetViewerState = useCallback(() => {
    if (audioRef.current) audioRef.current.srcObject = null;
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};
    setIsLive(false);
  }, []);

  // ─── VIEWER: join room to receive audio ────────────────────────────────────
  const joinVoiceRoom = useCallback(() => {
    if (!socket || !roomId) return;
    console.log("[VoiceChat] Joining room:", roomId);
    socket.emit("voice-join-room", { roomId });
  }, [socket, roomId]);

  // Auto-join room when socket and roomId are ready
  useEffect(() => {
    if (socket && roomId) {
      joinVoiceRoom();
    }
    // Cleanup: if roomId changes, we stop the current voice session
    return () => {
      if (!isAdmin) {
        resetViewerState();
      }
    };
  }, [socket, roomId, joinVoiceRoom, isAdmin, resetViewerState]);

  // ─── VIEWER: change volume ─────────────────────────────────────────────────
  const changeVolume = useCallback((val) => {
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  }, []);

  // ─── ADMIN: offer a specific viewer ───────────────────────────────────────
  const offerViewer = useCallback(async (viewerId) => {
    if (!localStreamRef.current) return;
    const peer = createPeer(viewerId);
    peersRef.current[viewerId] = peer;

    // Attach mic tracks
    localStreamRef.current.getTracks().forEach((track) =>
      peer.addTrack(track, localStreamRef.current)
    );

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("voice-offer", { offer, to: viewerId });
    setViewerCount(Object.keys(peersRef.current).length);
  }, [createPeer, socket]);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // ── ADMIN listeners ──────────────────────────────────────────────────────
    if (isAdmin) {
      // Server sends current viewer list when admin joins room
      const onRoomViewers = ({ viewers }) => {
        viewers.forEach((viewerId) => offerViewer(viewerId));
      };

      // A new viewer connected while admin is live
      const onViewerJoined = ({ viewerId }) => {
        if (isLive) offerViewer(viewerId);
      };

      // Viewer sent back an answer
      const onAnswer = async ({ answer, from }) => {
        const peer = peersRef.current[from];
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
        }
      };

      // ICE from viewer
      const onIce = async ({ candidate, from }) => {
        const peer = peersRef.current[from];
        if (peer) {
          try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
        }
      };

      socket.on("voice-room-viewers", onRoomViewers);
      socket.on("voice-viewer-joined", onViewerJoined);
      socket.on("voice-answer", onAnswer);
      socket.on("voice-ice-candidate", onIce);

      return () => {
        socket.off("voice-room-viewers", onRoomViewers);
        socket.off("voice-viewer-joined", onViewerJoined);
        socket.off("voice-answer", onAnswer);
        socket.off("voice-ice-candidate", onIce);
      };
    }

    // ── VIEWER listeners ─────────────────────────────────────────────────────
    const onOffer = async ({ offer, from }) => {
      const peer = createPeer(from);
      peersRef.current[from] = peer;

      // Play incoming audio
      peer.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.volume = volume;
        }
        setIsLive(true);
      };

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("voice-answer", { answer, to: from });
    };

    const onIce = async ({ candidate, from }) => {
      const peer = peersRef.current[from];
      if (peer) {
        try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      }
    };

    socket.on("voice-offer", onOffer);
    socket.on("voice-ice-candidate", onIce);
    socket.on("voice-stopped", resetViewerState);

    return () => {
      socket.off("voice-offer", onOffer);
      socket.off("voice-ice-candidate", onIce);
      socket.off("voice-stopped", resetViewerState);
    };
  }, [socket, isAdmin, volume, createPeer, resetViewerState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, [stopVoice]);

  return {
    isLive,
    isMuted,
    volume,
    viewerCount,
    error,
    audioRef,        // attach to <audio ref={audioRef} autoPlay />
    startVoice,      // admin: start mic
    stopVoice,       // admin: stop
    toggleMute,      // admin: mute/unmute
    joinVoiceRoom,   // viewer: join room
    changeVolume,    // viewer: set volume 0-1
  };
}
