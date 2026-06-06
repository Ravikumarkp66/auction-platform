"use client";

/**
 * CommentaryFeed — Ball-by-ball commentary timeline, newest first.
 * Event types: six (green), four (blue), wicket (red), dot (grey), wide/noball (amber), normal (white).
 */

const EVENT_STYLES = {
  six:    { dot: "cf-dot-six",    row: "cf-row-six",    icon: "🎯" },
  four:   { dot: "cf-dot-four",   row: "cf-row-four",   icon: "🏏" },
  wicket: { dot: "cf-dot-wicket", row: "cf-row-wicket", icon: "🔴" },
  wide:   { dot: "cf-dot-extra",  row: "cf-row-extra",  icon: "↔" },
  noball: { dot: "cf-dot-extra",  row: "cf-row-extra",  icon: "⚠" },
  dot:    { dot: "cf-dot-dot",    row: "cf-row-dot",    icon: "•" },
  normal: { dot: "cf-dot-normal", row: "",              icon: "" },
};

function CommentaryRow({ entry }) {
  const style = EVENT_STYLES[entry.eventType] || EVENT_STYLES.normal;

  return (
    <div className={`cf-row ${style.row}`}>
      <div className={`cf-dot ${style.dot}`}>
        {style.icon || entry.runs}
      </div>
      <div className="cf-body">
        <span className="cf-over">{entry.over}</span>
        <span className="cf-text">{entry.text}</span>
      </div>
      {(entry.isWicket || entry.isSix || entry.isBoundary) && (
        <div className="cf-badge-wrap">
          {entry.isWicket  && <span className="cf-badge cf-badge-w">W</span>}
          {entry.isSix     && <span className="cf-badge cf-badge-six">6</span>}
          {entry.isBoundary && !entry.isSix && (
            <span className="cf-badge cf-badge-four">4</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentaryFeed({
  commentary = [],
  loading = false,
  onLoadMore = null,
  hasMore = false,
}) {
  if (loading) {
    return (
      <div className="cf-loading">
        <div className="cf-loading-pulse" />
        <span>Loading commentary…</span>
      </div>
    );
  }

  if (!commentary.length) {
    return (
      <div className="cf-empty">
        <div className="cf-empty-icon">🏏</div>
        <p>No commentary yet. Start scoring to see ball-by-ball updates.</p>
      </div>
    );
  }

  return (
    <div className="cf-wrap">
      {commentary.map((entry, i) => (
        <CommentaryRow key={`${entry.over}-${i}`} entry={entry} />
      ))}

      {hasMore && onLoadMore && (
        <button className="cf-load-more" onClick={onLoadMore}>
          Load more
        </button>
      )}
    </div>
  );
}
