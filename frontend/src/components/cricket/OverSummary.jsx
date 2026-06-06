"use client";

/**
 * OverSummary — Grid of per-over summaries.
 * Over 1: 1 4 0 W 1 6
 * Shows over runs, wickets, extras and maiden indicator.
 */

function getBallBgClass(ball) {
  if (ball.isWicket)   return "ob-wicket";
  if (ball.isSix)      return "ob-six";
  if (ball.isBoundary) return "ob-four";
  if (ball.extras === "wd" || ball.extras === "nb") return "ob-extra";
  if (ball.runs === 0) return "ob-dot";
  return "ob-normal";
}

export default function OverSummary({ overSummaries = [] }) {
  if (!overSummaries.length) return null;

  return (
    <div className="over-summary-wrap">
      <div className="sc-section-title">Over Summary</div>
      <div className="over-list">
        {overSummaries.map((over, i) => (
          <div key={i} className="over-card">
            {/* Over Header */}
            <div className="over-card-header">
              <span className="over-card-num">Over {over.overNumber + 1}</span>
              {over.isMaiden && <span className="over-maiden-badge">M</span>}
              <span className="over-card-bowler">{over.bowler}</span>
              <span className="over-card-runs">{over.totalRuns} runs</span>
              {over.wickets > 0 && (
                <span className="over-card-wkts">{over.wickets}W</span>
              )}
            </div>

            {/* Ball-by-ball dots */}
            <div className="over-balls-row">
              {over.balls.map((ball, j) => (
                <div
                  key={j}
                  className={`over-ball ${getBallBgClass(ball)}`}
                  title={`Ball ${ball.ball}: ${ball.label}`}
                >
                  {ball.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
