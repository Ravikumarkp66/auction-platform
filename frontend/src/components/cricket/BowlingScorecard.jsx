"use client";

/**
 * BowlingScorecard — Full bowling card component.
 * Overs displayed as X.Y (e.g. 4.3 means 4 overs + 3 balls), never X.5 for a half-over.
 */
export default function BowlingScorecard({
  bowling = [],
  currentBowler = "",
  teamName = "",
}) {
  return (
    <div className="bowling-scorecard">
      <div className="sc-section-title">Bowling — {teamName}</div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th className="sc-th sc-th-left">Bowler</th>
              <th className="sc-th">O</th>
              <th className="sc-th">M</th>
              <th className="sc-th">R</th>
              <th className="sc-th">W</th>
              <th className="sc-th">Eco</th>
              <th className="sc-th sc-th-extra">Wd</th>
              <th className="sc-th sc-th-extra">NB</th>
            </tr>
          </thead>
          <tbody>
            {bowling.length === 0 && (
              <tr>
                <td colSpan={8} className="sc-td sc-empty">No bowling data yet</td>
              </tr>
            )}
            {bowling.map((b, i) => {
              // Overs: stored as "X.Y" where Y = balls in current over (0-5)
              // Example: legalBalls=27 → overs="4.3" ✓
              const overParts  = (b.overs || "0.0").split(".");
              const oversInt   = parseInt(overParts[0]) || 0;
              const ballsRem   = parseInt(overParts[1]) || 0;
              const displayOvers = `${oversInt}.${ballsRem}`;

              const isCurrent = b.name === currentBowler;
              return (
                <tr key={i} className={`sc-tr ${isCurrent ? "sc-tr-active" : ""}`}>
                  <td className="sc-td sc-td-left">
                    <div className="sc-batter-name">
                      {b.name}
                      {isCurrent && (
                        <span className="sc-badge sc-badge-bowler">▶</span>
                      )}
                    </div>
                  </td>
                  <td className="sc-td">{displayOvers}</td>
                  <td className="sc-td">{b.maidens}</td>
                  <td className="sc-td sc-td-runs">{b.runs}</td>
                  <td className="sc-td sc-td-wickets">{b.wickets}</td>
                  <td className="sc-td sc-td-sr">
                    {b.economy > 0 ? b.economy.toFixed(2) : "0.00"}
                  </td>
                  <td className="sc-td sc-td-extra">{b.wides || 0}</td>
                  <td className="sc-td sc-td-extra">{b.noBalls || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
