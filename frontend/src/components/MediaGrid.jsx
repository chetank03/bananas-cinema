function formatRating(value) {
  if (!value) {
    return "NR";
  }
  return value.toFixed(1);
}


export function MediaGrid({ items, emptyMessage, onOpenDetails, onToggleFavorite, isFavorite }) {
  if (!items.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="media-grid">
      {items.map((item) => (
        <article className="media-card" key={`${item.media_type}-${item.id}`}>
          <div className="media-poster">
            {item.poster_url ? <img src={item.poster_url} alt={item.title} loading="lazy" /> : null}
            <span className="media-type-badge">{item.media_type === "movie" ? "Movie" : "TV"}</span>
            <button
              className="favorite-chip"
              type="button"
              onClick={() => onToggleFavorite(item)}
              aria-label={isFavorite(item) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(item) ? "★" : "☆"}
            </button>
          </div>

          <div className="media-body">
            <div>
              <h3>{item.title}</h3>
              <div className="meta-row">
                <span>{item.year || "TBA"}</span>
                <span>{formatRating(item.rating)} / 10</span>
              </div>
            </div>
            <p className="overview">{item.overview ? `${item.overview.slice(0, 120)}...` : "No synopsis available."}</p>
            <button className="ghost-button" type="button" onClick={() => onOpenDetails(item)}>
              View details
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
