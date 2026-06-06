"use client";

/**
 * PartnershipTracker — Shows current partnership and full partnership history.
 */
export default function PartnershipTracker({
  currentPartnership = {},
  partnerships = [],
  highestPartnership = 0,
}) {
  const hasCurrent =
    currentPartnership?.batter1 || currentPartnership?.batter2;
  const hasHistory = partnerships.length > 0;

  return (
    <div className="partnership-wrap">
      {/* Current Partnership Card */}
      {hasCurrent && (
        <div className="pship-current">
          <div className="pship-current-label">Current Partnership</div>
          <div className="pship-current-runs">{currentPartnership.runs ?? 0}</div>
          <div className="pship-current-balls">
            {currentPartnership.balls ?? 0} balls
          </div>
          <div className="pship-current-pair">
            {[currentPartnership.batter1, currentPartnership.batter2]
              .filter(Boolean)
              .join(" & ")}
          </div>
        </div>
      )}

      {/* Highest Partnership */}
      {highestPartnership > 0 && (
        <div className="pship-highest">
          <span className="pship-highest-label">Highest Partnership</span>
          <span className="pship-highest-val">{highestPartnership} runs</span>
        </div>
      )}

      {/* Partnership History Table */}
      {hasHistory && (
        <div className="pship-history">
          <div className="sc-section-title" style={{ marginTop: "1rem" }}>
            Partnership History
          </div>
          <div className="sc-table-wrap">
            <table className="sc-table">
              <thead>
                <tr>
                  <th className="sc-th">#</th>
                  <th className="sc-th sc-th-left">Pair</th>
                  <th className="sc-th">Runs</th>
                  <th className="sc-th">Balls</th>
                </tr>
              </thead>
              <tbody>
                {partnerships.map((p, i) => (
                  <tr key={i} className="sc-tr">
                    <td className="sc-td">{p.wicketNumber}</td>
                    <td className="sc-td sc-td-left pship-pair-cell">
                      {[p.batter1, p.batter2].filter(Boolean).join(" & ")}
                    </td>
                    <td className="sc-td sc-td-runs">{p.runs}</td>
                    <td className="sc-td">{p.balls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
