/**
 * useCricketSocket - Shared realtime hook for cricket matches.
 * Handles connection, room joining, state updates, reconnection and cleanup.
 *
 * Usage:
 *   const { connected, reconnecting } = useCricketSocket(matchId, { onUpdate, onBall, onUndo });
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (typeof window === "undefined") return "http://localhost:5050";
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.");
  if (isLocal) return `http://${hostname}:5050`;
  return process.env.NEXT_PUBLIC_API_URL || "";
};

/**
 * @param {string} matchId  - MongoDB match _id
 * @param {object} handlers
 *   - onMatchUpdate(payload)  — emitted on match:update (lean state)
 *   - onBallAdded(ball)       — emitted on ball:add
 *   - onBallUndo(payload)     — emitted on ball:undo
 *   - onInningsEnd(payload)   — emitted on innings:end
 *   - onMatchEnd(payload)     — emitted on match:end
 */
export function useCricketSocket(matchId, handlers = {}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!matchId) return;

    const url = getSocketUrl();
    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setReconnecting(false);
      // Join the cricket match room
      socket.emit("join-cricket-match", matchId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("reconnect_attempt", () => {
      setReconnecting(true);
    });

    socket.on("reconnect", () => {
      setConnected(true);
      setReconnecting(false);
      // Re-join room after reconnect
      socket.emit("join-cricket-match", matchId);
    });

    // Cricket-specific events
    socket.on("match:update", (payload) => {
      handlersRef.current.onMatchUpdate?.(payload);
    });

    socket.on("ball:add", (ball) => {
      handlersRef.current.onBallAdded?.(ball);
    });

    socket.on("ball:undo", (payload) => {
      handlersRef.current.onBallUndo?.(payload);
    });

    socket.on("innings:end", (payload) => {
      handlersRef.current.onInningsEnd?.(payload);
    });

    socket.on("match:end", (payload) => {
      handlersRef.current.onMatchEnd?.(payload);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("reconnect_attempt");
      socket.off("reconnect");
      socket.off("match:update");
      socket.off("ball:add");
      socket.off("ball:undo");
      socket.off("innings:end");
      socket.off("match:end");
      socket.disconnect();
    };
  }, [matchId]);

  return { connected, reconnecting };
}
