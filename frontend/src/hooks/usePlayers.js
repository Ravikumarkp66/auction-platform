/**
 * usePlayers — localStorage-backed player store.
 * Key: cricket_players_v1
 * Players can be filtered by teamId or tournamentId.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "cricket_players_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

// ── Role / style metadata (shared) ───────────────────────────
export const ROLES = [
  { id: "batsman",      label: "Batsman",        icon: "🏏", color: "#f59e0b" },
  { id: "bowler",       label: "Bowler",          icon: "⚡", color: "#3b82f6" },
  { id: "allrounder",   label: "All Rounder",     icon: "🌟", color: "#8b5cf6" },
  { id: "wicketkeeper", label: "Wicket Keeper",   icon: "🧤", color: "#10b981" },
];

export const BATTING_STYLES = [
  { id: "right", label: "Right Hand Bat", short: "RHB" },
  { id: "left",  label: "Left Hand Bat",  short: "LHB" },
];

export const BOWLING_STYLES = [
  { id: "right-fast",   label: "Right Arm Fast",   short: "RAF" },
  { id: "right-medium", label: "Right Arm Medium", short: "RAM" },
  { id: "left-fast",    label: "Left Arm Fast",    short: "LAF" },
  { id: "spin",         label: "Spin",             short: "SPN" },
  { id: "off-spin",     label: "Off Spin",         short: "OB"  },
  { id: "leg-spin",     label: "Leg Spin",         short: "LB"  },
];

export function getRole(id)         { return ROLES.find(r => r.id === id); }
export function getBattingStyle(id) { return BATTING_STYLES.find(b => b.id === id); }
export function getBowlingStyle(id) { return BOWLING_STYLES.find(b => b.id === id); }

// ── Hook ──────────────────────────────────────────────────────
export function usePlayers(filter = {}) {
  const [allPlayers, setAllPlayers] = useState([]);

  useEffect(() => { setAllPlayers(load()); }, []);

  // Filtered view
  const players = allPlayers.filter(p => {
    if (filter.teamId       && p.teamId       !== filter.teamId)       return false;
    if (filter.tournamentId && p.tournamentId !== filter.tournamentId) return false;
    return true;
  });

  const addPlayer = useCallback((data) => {
    const player = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
    setAllPlayers(prev => {
      const next = [player, ...prev];
      save(next);
      return next;
    });
    return player;
  }, []);

  const updatePlayer = useCallback((id, patch) => {
    setAllPlayers(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      save(next);
      return next;
    });
  }, []);

  const deletePlayer = useCallback((id) => {
    setAllPlayers(prev => {
      const next = prev.filter(p => p.id !== id);
      save(next);
      return next;
    });
  }, []);

  const getPlayer = useCallback((id) => allPlayers.find(p => p.id === id) || null, [allPlayers]);

  return { players, allPlayers, addPlayer, updatePlayer, deletePlayer, getPlayer };
}
