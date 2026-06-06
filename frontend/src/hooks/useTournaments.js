/**
 * useTournaments — localStorage-backed tournament store.
 *
 * Shared between /cricket/tournaments/new (create) and
 * /matches (hub list) so changes appear immediately across pages.
 *
 * Usage:
 *   const { tournaments, addTournament, updateTournament, deleteTournament } = useTournaments();
 */
"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "cricket_tournaments_v1";

// ── Status helper ─────────────────────────────────────────────
export function getTournamentStatus(startDate, endDate) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (!startDate || !endDate) return "upcoming";
  if (today < startDate)  return "upcoming";
  if (today > endDate)    return "completed";
  return "ongoing";
}

// ── Format & Ball maps (kept here so both pages share them) ───
export const FORMATS = [
  { id: "league",          label: "League",            icon: "⚖️",  desc: "Round-robin group stage"  },
  { id: "knockout",        label: "Knockout",           icon: "⚡",  desc: "Single-elimination bracket" },
  { id: "league+playoffs", label: "League + Playoffs",  icon: "🏆", desc: "Group stage then finals"  },
];

export const BALL_TYPES = [
  { id: "tennis",  label: "Tennis Ball",  icon: "🎾", desc: "Soft, amateur friendly"  },
  { id: "leather", label: "Leather Ball", icon: "🏏", desc: "Professional standard"   },
  { id: "tape",    label: "Tape Ball",    icon: "🔴", desc: "Street cricket classic"   },
];

// ── Hook ──────────────────────────────────────────────────────
export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setTournaments(JSON.parse(raw));
    } catch { /* ignore corrupt data */ }
  }, []);

  // Persist to localStorage whenever state changes
  const persist = useCallback((list) => {
    setTournaments(list);
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* quota */ }
  }, []);

  // ── CRUD ──────────────────────────────────────────────────
  const addTournament = useCallback((data) => {
    const entry = {
      id:        crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    persist(prev => {
      const next = [entry, ...prev];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
    return entry;
  }, [persist]);

  const updateTournament = useCallback((id, patch) => {
    setTournaments(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  const deleteTournament = useCallback((id) => {
    setTournaments(prev => {
      const next = prev.filter(t => t.id !== id);
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  return { tournaments, addTournament, updateTournament, deleteTournament };
}
