/**
 * useMatches — localStorage-backed cricket match store.
 * Key: cricket_matches_v1
 */
"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "cricket_matches_v1";

function load()      { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function save(list)  { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); }      catch { /* quota */ } }

// ── Constants ─────────────────────────────────────────────────
export const MATCH_TYPES = [
  { id: "league",    label: "League Match", icon: "🏏", color: "#a78bfa" },
  { id: "semifinal", label: "Semi Final",   icon: "⚔️", color: "#f59e0b" },
  { id: "final",     label: "Final",        icon: "🏆", color: "#f97316" },
  { id: "practice",  label: "Practice",     icon: "🎯", color: "#64748b" },
];

export const OVERS_PRESETS = [5, 10, 20];

export function getMatchType(id) { return MATCH_TYPES.find(m => m.id === id); }

/** Derive status from match date + manual status override */
export function getMatchStatus(match) {
  if (match.status === "live"      ) return "live";
  if (match.status === "completed" ) return "completed";
  if (!match.date) return "upcoming";
  const matchDate = new Date(`${match.date}T${match.time || "00:00"}`);
  const now = new Date();
  return matchDate > now ? "upcoming" : "upcoming"; // will be set manually
}

// ── Hook ──────────────────────────────────────────────────────
export function useMatches(tournamentId) {
  const [allMatches, setAllMatches] = useState([]);

  useEffect(() => { setAllMatches(load()); }, []);

  const matches = tournamentId
    ? allMatches.filter(m => m.tournamentId === tournamentId)
    : allMatches;

  const addMatch = useCallback((data) => {
    const match = {
      id: crypto.randomUUID(),
      status: "upcoming",
      createdAt: new Date().toISOString(),
      ...data,
    };
    setAllMatches(prev => {
      const next = [match, ...prev];
      save(next);
      return next;
    });
    return match;
  }, []);

  const updateMatch = useCallback((id, patch) => {
    setAllMatches(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m);
      save(next);
      return next;
    });
  }, []);

  const deleteMatch = useCallback((id) => {
    setAllMatches(prev => {
      const next = prev.filter(m => m.id !== id);
      save(next);
      return next;
    });
  }, []);

  const getMatch = useCallback((id) => allMatches.find(m => m.id === id) || null, [allMatches]);

  return { matches, allMatches, addMatch, updateMatch, deleteMatch, getMatch };
}
