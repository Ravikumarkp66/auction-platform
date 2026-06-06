/**
 * useTeams — localStorage-backed team store, scoped per tournament.
 * Key: cricket_teams_v1
 * Each team: { id, tournamentId, name, shortName, logo, captain, color, createdAt }
 */
"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "cricket_teams_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

function save(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

export function useTeams(tournamentId) {
  const [allTeams, setAllTeams] = useState([]);

  useEffect(() => { setAllTeams(load()); }, []);

  const teams = tournamentId
    ? allTeams.filter(t => t.tournamentId === tournamentId)
    : allTeams;

  const addTeam = useCallback((data) => {
    const team = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
    setAllTeams(prev => {
      const next = [team, ...prev];
      save(next);
      return next;
    });
    return team;
  }, []);

  const updateTeam = useCallback((id, patch) => {
    setAllTeams(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      save(next);
      return next;
    });
  }, []);

  const deleteTeam = useCallback((id) => {
    setAllTeams(prev => {
      const next = prev.filter(t => t.id !== id);
      save(next);
      return next;
    });
  }, []);

  const getTeam = useCallback((id) => allTeams.find(t => t.id === id) || null, [allTeams]);

  return { teams, allTeams, addTeam, updateTeam, deleteTeam, getTeam };
}
