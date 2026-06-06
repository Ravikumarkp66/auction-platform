"use client";

import { useState, useEffect } from "react";

export default function CricketScoringAdmin() {
  const [match, setMatch] = useState(null);
  const [matchId, setMatchId] = useState(""); 
  
  // Selections
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  // Fetch live score
  const fetchMatch = async (id) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/cricket/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data);
        setStriker(data.currentStriker || "");
        setNonStriker(data.currentNonStriker || "");
        setBowler(data.currentBowler || "");
      }
    } catch (err) {
      console.error("Error fetching match", err);
    }
  };

  // Add a ball
  const handleBall = async (runs, extraType = "none", isWicket = false) => {
    if (!match || !match._id) return alert("No active match");
    if (!striker || !bowler) return alert("Select striker and bowler");

    const payload = {
      runs,
      extraType,
      isWicket,
      dismissalType: isWicket ? "bowled" : "",
      dismissedBatsman: isWicket ? striker : ""
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/cricket/${match._id}/ball`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match);
      }
    } catch (err) {
      console.error("Error adding ball", err);
    }
  };

  const undoBall = async () => {
    if (!match || !match._id) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/cricket/${match._id}/undo`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Undone! Re-fetching match state...");
        fetchMatch(match._id);
      }
    } catch (err) {
      console.error("Error undoing ball", err);
    }
  };

  // Helper to get current inning stats
  const currentInning = match?.innings?.[match.currentInnings - 1];

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Cricket Scoring Admin</h1>
      
      {/* Dev Tool: Load Match */}
      <div style={{ marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "10px" }}>
        <input 
          type="text" 
          placeholder="Enter Match ID" 
          value={matchId} 
          onChange={e => setMatchId(e.target.value)}
        />
        <button onClick={() => fetchMatch(matchId)}>Load Match</button>
      </div>

      {!match ? (
        <p>No match loaded. Please create a match via API and load its ID here.</p>
      ) : (
        <div>
          {/* Scoreboard */}
          <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "20px" }}>
            <h2>{match.teamA.name} vs {match.teamB.name}</h2>
            <h3>
              Score: {currentInning?.totalRuns || 0} / {currentInning?.totalWickets || 0}
            </h3>
            <p>
              Overs: {Math.floor((currentInning?.totalBalls || 0) / 6)}.{(currentInning?.totalBalls || 0) % 6} 
              (Target: {match.oversLimit})
            </p>
          </div>

          {/* Player Selection */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label>Striker: </label>
              <input type="text" value={striker} onChange={e => setStriker(e.target.value)} />
            </div>
            <div>
              <label>Non-Striker: </label>
              <input type="text" value={nonStriker} onChange={e => setNonStriker(e.target.value)} />
            </div>
            <div>
              <label>Bowler: </label>
              <input type="text" value={bowler} onChange={e => setBowler(e.target.value)} />
            </div>
            <button onClick={async () => {
              // Quick update API call can be added here
              alert("Players selected (local state updated)");
            }}>Update Players</button>
          </div>

          {/* Scoring Panel */}
          <div style={{ border: "1px solid #ccc", padding: "10px" }}>
            <h3>Scoring Panel</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <button key={runs} onClick={() => handleBall(runs, "none", false)} style={{ padding: "10px" }}>
                  {runs}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
              <button onClick={() => handleBall(0, "none", true)} style={{ padding: "10px", background: "red", color: "white" }}>W</button>
              <button onClick={() => handleBall(0, "wd", false)} style={{ padding: "10px" }}>WD</button>
              <button onClick={() => handleBall(0, "nb", false)} style={{ padding: "10px" }}>NB</button>
              <button onClick={() => handleBall(1, "b", false)} style={{ padding: "10px" }}>BYE (1)</button>
              <button onClick={() => handleBall(1, "lb", false)} style={{ padding: "10px" }}>LB (1)</button>
            </div>
            
            <button onClick={undoBall} style={{ padding: "10px", background: "orange" }}>Undo Last Ball</button>
          </div>
        </div>
      )}
    </div>
  );
}
