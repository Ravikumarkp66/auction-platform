"use client";

import { useState, useEffect, use, useCallback } from "react";
import { ArrowLeft, RefreshCw, Trophy, MapPin, Calendar, Info } from "lucide-react";
import Link from "next/link";
import io from "socket.io-client";

import BattingScorecard   from "@/components/cricket/BattingScorecard";
import BowlingScorecard   from "@/components/cricket/BowlingScorecard";
import CommentaryFeed     from "@/components/cricket/CommentaryFeed";
import FallOfWickets      from "@/components/cricket/FallOfWickets";
import PartnershipTracker from "@/components/cricket/PartnershipTracker";
import OverSummary        from "@/components/cricket/OverSummary";
import "../scorecard.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Tab definitions ───────────────────────────────────────────
const TABS = ["Batting", "Bowling", "Commentary", "Match Info"];

// ── Socket (lazy singleton) ───────────────────────────────────
let _socket = null;
function getSocket() {
  if (!_socket) _socket = io(API_URL, { transports: ["websocket", "polling"] });
  return _socket;
}

export default function ScorecardPage({ params }) {
  const { matchId } = use(params);

  const [scorecard, setScorecard]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [activeTab, setActiveTab]         = useState("Batting");
  const [activeInnings, setActiveInnings] = useState(1);

  // Commentary pagination
  const [commentary, setCommentary]       = useState([]);
  const [commPage, setCommPage]           = useState(1);
  const [commLoading, setCommLoading]     = useState(false);
  const [commHasMore, setCommHasMore]     = useState(false);

  // ── Fetch full scorecard ──────────────────────────────────────
  const fetchScorecard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/${matchId}/scorecard`);
      if (!res.ok) throw new Error("Failed to load scorecard");
      const data = await res.json();
      setScorecard(data);
      // Default to current / last innings
      const lastInning = data.innings[data.innings.length - 1];
      if (lastInning) setActiveInnings(lastInning.inningsNumber);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // ── Fetch commentary ─────────────────────────────────────────
  const fetchCommentary = useCallback(async (page = 1, append = false) => {
    setCommLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/cricket/${matchId}/commentary?innings=${activeInnings}&page=${page}&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      setCommentary(prev => append ? [...prev, ...data.commentary] : data.commentary);
      setCommHasMore(data.total > page * 20);
      setCommPage(page);
    } finally {
      setCommLoading(false);
    }
  }, [matchId, activeInnings]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  // ── Re-fetch commentary when innings or tab changes ───────────
  useEffect(() => {
    if (activeTab === "Commentary") {
      fetchCommentary(1, false);
    }
  }, [activeTab, activeInnings, fetchCommentary]);

  // ── Real-time updates via Socket.IO ──────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-cricket-match", matchId);

    const onUpdate = () => fetchScorecard();
    socket.on("match:update", onUpdate);
    socket.on("ball:add",     onUpdate);
    socket.on("ball:undo",    onUpdate);

    return () => {
      socket.off("match:update", onUpdate);
      socket.off("ball:add",     onUpdate);
      socket.off("ball:undo",    onUpdate);
    };
  }, [matchId, fetchScorecard]);

  // ── Derived data ──────────────────────────────────────────────
  const currentInning = scorecard?.innings?.find(
    inn => inn.inningsNumber === activeInnings
  );

  // ── Loading / Error ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="sc-loader">
        <div className="sc-spinner" />
        <span>Loading scorecard…</span>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="sc-loader">
        <Info size={32} color="#ef4444" />
        <span>{error || "Scorecard not found"}</span>
        <button
          className="sc-back-btn"
          style={{ color: "#6c63ff", marginTop: "0.5rem" }}
          onClick={fetchScorecard}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { teamA, teamB, result, toss, status, matchFormat, oversLimit, venue, matchDate, summary } = scorecard;

  // ── Helpers ────────────────────────────────────────────────────
  const getInningsLabel = (num) =>
    num === 1 ? "1st Innings" : num === 2 ? "2nd Innings" : `Innings ${num}`;

  return (
    <div className="scorecard-page">

      {/* ══ Hero / Header ══ */}
      <div className="sc-hero">
        <div className="sc-hero-inner">

          {/* Back + title row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <Link href={`/scoring/matches`} className="sc-back-btn">
              <ArrowLeft size={16} /> Matches
            </Link>
            <span style={{ flex: 1 }} />
            <button
              className="sc-back-btn"
              style={{ gap: "0.3rem" }}
              onClick={fetchScorecard}
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Team scores */}
          <div className="sc-hero-teams">
            {scorecard.innings.map((inn, i) => (
              <div key={i} className="sc-hero-team">
                <div className="sc-hero-team-name">{inn.battingTeam}</div>
                <div className="sc-hero-team-score">
                  {inn.totalRuns}/{inn.totalWickets}
                </div>
                <div className="sc-hero-team-overs">({inn.overs})</div>
              </div>
            ))}
            {scorecard.innings.length === 1 && (
              <div className="sc-hero-team" style={{ opacity: 0.35 }}>
                <div className="sc-hero-team-name">{scorecard.innings[0].bowlingTeam}</div>
                <div className="sc-hero-team-score">–</div>
                <div className="sc-hero-team-overs">Yet to bat</div>
              </div>
            )}
          </div>

          {/* Result */}
          {result?.description && (
            <div className="sc-hero-result">
              <Trophy size={12} style={{ display: "inline", marginRight: "0.3rem" }} />
              {result.description}
            </div>
          )}
          {status === "live" && (
            <div className="sc-hero-result" style={{ color: "#ef4444", animation: "pulse 1.5s infinite" }}>
              ● LIVE
            </div>
          )}

          {/* Meta */}
          <div className="sc-hero-meta">
            <span>{matchFormat} • {oversLimit} ov</span>
            {venue && (
              <span>
                <MapPin size={10} style={{ display: "inline" }} /> {venue}
              </span>
            )}
            {matchDate && (
              <span>
                <Calendar size={10} style={{ display: "inline" }} /> {matchDate}
              </span>
            )}
          </div>

        </div>

        {/* Tabs */}
        <div className="sc-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`sc-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Content ══ */}
      <div className="sc-content">

        {/* ── Innings selector (not shown on Match Info) ─────── */}
        {activeTab !== "Match Info" && scorecard.innings.length > 1 && (
          <div className="sc-innings-switcher">
            {scorecard.innings.map(inn => (
              <button
                key={inn.inningsNumber}
                className={`sc-innings-btn ${activeInnings === inn.inningsNumber ? "active" : ""}`}
                onClick={() => setActiveInnings(inn.inningsNumber)}
              >
                {inn.battingTeam} {getInningsLabel(inn.inningsNumber)}
              </button>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: BATTING
        ════════════════════════════════════════════════════ */}
        {activeTab === "Batting" && currentInning && (
          <div>
            <BattingScorecard
              batting={currentInning.batting}
              didNotBat={currentInning.didNotBat}
              currentStriker={scorecard.batting?.striker || ""}
              currentNonStriker={scorecard.batting?.nonStriker || ""}
              teamName={currentInning.battingTeam}
              totalRuns={currentInning.totalRuns}
              totalWickets={currentInning.totalWickets}
              overs={currentInning.overs}
              extras={currentInning.extras}
            />

            <div className="sc-innings-divider">
              <div className="sc-innings-divider-line" />
              <span className="sc-innings-label">Fall of Wickets</span>
              <div className="sc-innings-divider-line" />
            </div>

            <FallOfWickets fallOfWickets={currentInning.fallOfWickets} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: BOWLING
        ════════════════════════════════════════════════════ */}
        {activeTab === "Bowling" && currentInning && (
          <div>
            <BowlingScorecard
              bowling={currentInning.bowling}
              currentBowler={scorecard.bowling?.bowler || ""}
              teamName={currentInning.bowlingTeam}
            />

            <div className="sc-innings-divider">
              <div className="sc-innings-divider-line" />
              <span className="sc-innings-label">Partnerships</span>
              <div className="sc-innings-divider-line" />
            </div>

            <PartnershipTracker
              currentPartnership={currentInning.currentPartnership}
              partnerships={currentInning.partnerships}
              highestPartnership={currentInning.highestPartnership}
            />

            <div className="sc-innings-divider">
              <div className="sc-innings-divider-line" />
              <span className="sc-innings-label">Over Summary</span>
              <div className="sc-innings-divider-line" />
            </div>

            <OverSummary overSummaries={currentInning.overSummaries} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            TAB: COMMENTARY
        ════════════════════════════════════════════════════ */}
        {activeTab === "Commentary" && (
          <CommentaryFeed
            commentary={commentary}
            loading={commLoading && commPage === 1}
            hasMore={commHasMore}
            onLoadMore={() => fetchCommentary(commPage + 1, true)}
          />
        )}

        {/* ════════════════════════════════════════════════════
            TAB: MATCH INFO
        ════════════════════════════════════════════════════ */}
        {activeTab === "Match Info" && (
          <div className="match-info-wrap">

            {/* Result */}
            {result?.description && (
              <div className="mi-result-card">
                <div className="mi-result-text">
                  <Trophy size={14} style={{ display: "inline", marginRight: "0.4rem" }} />
                  {result.description}
                </div>
              </div>
            )}

            {/* Key Stats */}
            {summary && (
              <div>
                <div className="sc-section-title" style={{ marginBottom: "0.5rem" }}>Key Stats</div>
                <div className="mi-stats-strip">
                  <div className="mi-stat-box">
                    <div className="mi-stat-val" style={{ color: "#22c55e" }}>
                      {summary.totalSixes}
                    </div>
                    <div className="mi-stat-label">Sixes</div>
                  </div>
                  <div className="mi-stat-box">
                    <div className="mi-stat-val" style={{ color: "#3b82f6" }}>
                      {summary.totalFours}
                    </div>
                    <div className="mi-stat-label">Fours</div>
                  </div>
                  <div className="mi-stat-box">
                    <div className="mi-stat-val" style={{ color: "#f59e0b" }}>
                      {summary.totalExtras}
                    </div>
                    <div className="mi-stat-label">Extras</div>
                  </div>
                </div>

                <div className="mi-card">
                  <div className="mi-card-title">Star Performers</div>
                  <div className="mi-row">
                    <span className="mi-label">🏏 Top Scorer</span>
                    <span className="mi-val">
                      {summary.topScorer || "–"}
                      {summary.topScorerRuns > 0 && (
                        <span style={{ color: "#64748b", fontSize: "0.78rem", marginLeft: "0.3rem" }}>
                          ({summary.topScorerRuns} off {summary.topScorerBalls})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mi-row">
                    <span className="mi-label">🎳 Best Bowler</span>
                    <span className="mi-val">
                      {summary.bestBowler || "–"}
                      {summary.bestBowlerFigures && (
                        <span style={{ color: "#64748b", fontSize: "0.78rem", marginLeft: "0.3rem" }}>
                          ({summary.bestBowlerFigures})
                        </span>
                      )}
                    </span>
                  </div>
                  {summary.highestPartnership > 0 && (
                    <div className="mi-row">
                      <span className="mi-label">🤝 Best Partnership</span>
                      <span className="mi-val">{summary.highestPartnership} runs</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Match Details */}
            <div className="mi-card">
              <div className="mi-card-title">Match Details</div>
              <div className="mi-row">
                <span className="mi-label">Format</span>
                <span className="mi-val">{matchFormat} ({oversLimit} overs)</span>
              </div>
              {venue && (
                <div className="mi-row">
                  <span className="mi-label">Venue</span>
                  <span className="mi-val">{venue}</span>
                </div>
              )}
              {matchDate && (
                <div className="mi-row">
                  <span className="mi-label">Date</span>
                  <span className="mi-val">{matchDate}</span>
                </div>
              )}
              {toss?.winner && (
                <div className="mi-row">
                  <span className="mi-label">Toss</span>
                  <span className="mi-val">
                    {toss.winner} chose to {toss.decision}
                  </span>
                </div>
              )}
            </div>

            {/* Innings Scorelines */}
            <div className="mi-card">
              <div className="mi-card-title">Innings Summary</div>
              {scorecard.innings.map(inn => (
                <div key={inn.inningsNumber} className="mi-row">
                  <span className="mi-label">{inn.battingTeam}</span>
                  <span className="mi-val">
                    {inn.totalRuns}/{inn.totalWickets}
                    <span style={{ color: "#64748b", fontSize: "0.75rem", marginLeft: "0.3rem" }}>
                      ({inn.overs} ov)
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <Link
                href={`/match/score/${matchId}`}
                className="sc-back-btn"
                style={{
                  background: "rgba(108,99,255,0.15)",
                  border: "1px solid rgba(108,99,255,0.3)",
                  borderRadius: "8px",
                  padding: "0.6rem 1rem",
                  color: "#6c63ff",
                  fontWeight: 700,
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                🏏 Open Scorer
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
