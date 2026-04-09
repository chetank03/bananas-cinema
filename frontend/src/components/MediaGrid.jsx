import { StarRating } from "./StarRating";

function formatRating(value) {
  if (!value) {
    return "NR";
  }
  return value.toFixed(1);
}


export function MediaGrid({ items, emptyMessage, onOpenDetails, onToggleFavorite, isFavorite, compact = false }) {
  if (!items.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className={`media-grid${compact ? " media-grid-compact" : ""}`}>
      {items.map((item) => (
        <article
          className={`media-card${compact ? " media-card-compact" : ""}`}
          key={`${item.media_type}-${item.id}`}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetails(item)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenDetails(item);
            }
          }}
        >
          <div className={`media-poster${compact ? " media-poster-compact" : ""}`}>
            {item.poster_url ? <img src={item.poster_url} alt={item.title} loading="lazy" /> : null}
            <span className="media-type-badge">{item.media_type === "movie" ? "Movie" : "TV"}</span>
            <button
              className="favorite-chip"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(item);
              }}
              aria-label={isFavorite(item) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(item) ? "★" : "☆"}
            </button>
          </div>

          <div className={`media-body${compact ? " media-body-compact" : ""}`}>
            <div className="media-body-main">
              <h3>{item.title}</h3>
            </div>
            <div className="media-body-footer">
              <div className="meta-row">
                <span>{item.year || "TBA"}</span>
                <span>{formatRating(item.rating)} / 10</span>
              </div>
              {item.watch_later ? <div className="watch-later-badge">Watch later</div> : null}
              {item.personal_rating ? (
                <div className="personal-rating-badge">
                  <span className="personal-rating-label">Your rating</span>
                  <div className="personal-rating-value">
                    <StarRating value={item.personal_rating} size="sm" />
                    <span>{item.personal_rating}/5</span>
                  </div>
                </div>
              ) : null}
            </div>
            {!compact ? (
              <p className="overview">{item.overview ? `${item.overview.slice(0, 120)}...` : "No synopsis available."}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
