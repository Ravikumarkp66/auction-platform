"use client";

/**
 * BattingScorecard — Full batting card component.
 * Displays batsman, dismissal info, R, B, 4s, 6s, SR.
 * Also shows "Did Not Bat" section and current batsmen marker.
 */
export default function BattingScorecard({
  batting = [],
  didNotBat = [],
  currentStriker = "",
  currentNonStriker = "",
  teamName = "",
  totalRuns = 0,
  totalWickets = 0,
  overs = "0.0",
  extras = {},
}) {
  const extraTotal = extras.total || 0;
  const extrasDetail = [
    extras.wides   > 0 && `w ${extras.wides}`,
    extras.noBalls > 0 && `nb ${extras.noBalls}`,
    extras.byes    > 0 && `b ${extras.byes}`,
    extras.legByes > 0 && `lb ${extras.legByes}`,
  ].filter(Boolean).join(", ");

  const isCurrent = (name) =>
    name === currentStriker || name === currentNonStriker;

  return (
    <div className="batting-scorecard">
      {/* Team total header */}
      <div className="sc-team-header">
        <span className="sc-team-name">{teamName}</span>
        <span className="sc-team-score">
          {totalRuns}/{totalWickets}{" "}
          <span className="sc-team-overs">({overs} Ov)</span>
        </span>
      </div>

      {/* Batting table */}
      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th className="sc-th sc-th-left">Batter</th>
              <th className="sc-th">R</th>
              <th className="sc-th">B</th>
              <th className="sc-th">4s</th>
              <th className="sc-th">6s</th>
              <th className="sc-th">SR</th>
            </tr>
          </thead>
          <tbody>
            {batting.map((p, i) => (
              <tr
                key={i}
                className={`sc-tr ${isCurrent(p.name) ? "sc-tr-active" : ""}`}
              >
                <td className="sc-td sc-td-left">
                  <div className="sc-batter-name">
                    {p.name}
                    {p.name === currentStriker && (
                      <span className="sc-badge sc-badge-striker">*</span>
                    )}
                  </div>
                  <div className="sc-dismissal">{p.dismissal}</div>
                </td>
                <td className="sc-td sc-td-runs">{p.runs}</td>
                <td className="sc-td">{p.balls}</td>
                <td className="sc-td">{p.fours}</td>
                <td className="sc-td">{p.sixes}</td>
                <td className="sc-td sc-td-sr">
                  {p.strikeRate > 0 ? p.strikeRate.toFixed(1) : "0.0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extras row */}
      <div className="sc-extras-row">
        <span className="sc-extras-label">Extras</span>
        <span className="sc-extras-val">{extraTotal}</span>
        {extrasDetail && (
          <span className="sc-extras-detail">({extrasDetail})</span>
        )}
      </div>

      {/* Total row */}
      <div className="sc-total-row">
        <span className="sc-total-label">Total</span>
        <span className="sc-total-val">
          {totalRuns}/{totalWickets} ({overs} Ov)
        </span>
      </div>

      {/* Did Not Bat */}
      {didNotBat.length > 0 && (
        <div className="sc-dnb">
          <span className="sc-dnb-label">Did Not Bat: </span>
          <span className="sc-dnb-names">{didNotBat.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
