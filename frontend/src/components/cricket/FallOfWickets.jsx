"use client";

/**
 * FallOfWickets — Horizontal scrollable FOW bar.
 * Format: 45/2 - Rohit 23 (5.4)
 */
export default function FallOfWickets({ fallOfWickets = [] }) {
  if (!fallOfWickets.length) return null;

  return (
    <div className="fow-wrap">
      <div className="sc-section-title">Fall of Wickets</div>
      <div className="fow-list">
        {fallOfWickets.map((w, i) => (
          <div key={i} className="fow-item">
            <span className="fow-score">
              {w.runs}/{w.wicketNumber}
            </span>
            <span className="fow-dash">–</span>
            <span className="fow-detail">
              {w.batsman} ({w.over})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
