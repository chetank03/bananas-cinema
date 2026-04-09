import { useEffect, useState } from "react";

function starFill(value, index) {
  if (value >= index) {
    return 100;
  }
  if (value >= index - 0.5) {
    return 50;
  }
  return 0;
}

export function DetailPanel({
  item,
  reviews,
  user,
  favorite,
  onClose,
  onCreateReview,
  onToggleFavorite,
  onSaveFavorite,
  onSaveWatchLater,
  onOpenWatchlists,
  onRemoveFavorite,
  onRequireAuth,
  isFavorite,
}) {
  const [formState, setFormState] = useState({ rating: 8, content: "" });
  const [personalRating, setPersonalRating] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormState({ rating: 8, content: "" });
    setPersonalRating(favorite?.personal_rating ? String(favorite.personal_rating) : "");
    setError("");
    setSubmitting(false);
    setSavingFavorite(false);
  }, [item, favorite]);

  if (!item) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await onCreateReview(formState);
      setFormState({ rating: 8, content: "" });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveFavoriteClick() {
    setSavingFavorite(true);
    setError("");

    try {
      await onSaveFavorite(item, personalRating ? Number(personalRating) : null);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingFavorite(false);
    }
  }

  async function handleSaveWatchLaterClick() {
    setSavingFavorite(true);
    setError("");

    try {
      await onSaveWatchLater(item);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingFavorite(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <aside className="detail-panel" onClick={(event) => event.stopPropagation()}>
        {item.backdrop_url ? <img className="detail-backdrop" src={item.backdrop_url} alt={item.title} /> : null}

        <div className="detail-header">
          <div>
            <p className="section-label">{item.media_type === "movie" ? "Movie" : "TV Show"}</p>
            <h2>{item.title}</h2>
            {item.trailer_url ? (
              <a className="primary-button inline-link detail-trailer-link" href={item.trailer_url} target="_blank" rel="noreferrer">
                Watch trailer
              </a>
            ) : null}
            <div className="pill-row">
              {(item.genres || []).map((genre) => (
                <span className="pill" key={genre}>
                  {genre}
                </span>
              ))}
            </div>
            <div className="meta-row">
              <span>{item.release_date || "Release date TBD"}</span>
              <span>{(item.rating || 0).toFixed(1)} / 10</span>
              {item.runtime ? <span>{item.runtime} min</span> : null}
            </div>
          </div>

          <div className="button-row">
            {user ? (
              <div className="favorite-rating-panel">
                <label>Star rating</label>
                <div className="star-picker">
                  <div className="star-options">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div className="star-button-wrap" key={value}>
                        <button
                          className={`star-button${Number(personalRating) >= value - 0.5 ? " star-button-active" : ""}`}
                          type="button"
                          onClick={() => setPersonalRating(String(value))}
                          aria-label={`Rate ${value} out of 5`}
                        >
                          <span className="star-base">★</span>
                          <span className="star-fill" style={{ width: `${starFill(Number(personalRating) || 0, value)}%` }}>
                            <span className="star-glyph">★</span>
                          </span>
                        </button>
                        <button
                          className="star-half-hit"
                          type="button"
                          onClick={() => setPersonalRating(String(value - 0.5))}
                          aria-label={`Rate ${value - 0.5} out of 5`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button className="ghost-button star-clear" type="button" onClick={() => setPersonalRating("")}>
                  Clear
                </button>
                <div className="favorite-rating-row">
                  <button className="favorite-button" type="button" onClick={handleSaveFavoriteClick} disabled={savingFavorite}>
                    {savingFavorite ? "Saving..." : isFavorite(item) ? "Update watched" : "Mark watched"}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => onOpenWatchlists(item)} disabled={savingFavorite}>
                    Add to watchlist
                  </button>
                  <button className="ghost-button" type="button" onClick={handleSaveWatchLaterClick} disabled={savingFavorite}>
                    {favorite?.watch_later ? "In watch later" : "Watch later"}
                  </button>
                  {isFavorite(item) ? (
                    <button className="ghost-button" type="button" onClick={() => onRemoveFavorite(item)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <button className="favorite-button" type="button" onClick={() => onToggleFavorite(item)}>
                Mark watched
              </button>
            )}
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Overview</h3>
            <p>{item.overview || "No overview available."}</p>

            <h3>Cast</h3>
            <div className="detail-list">
              {(item.cast || []).length ? (
                item.cast.map((person) => (
                  <div key={person.id}>
                    <strong>{person.name}</strong>
                    <p>{person.character || "Cast member"}</p>
                  </div>
                ))
              ) : (
                <p>No cast details available.</p>
              )}
            </div>

            <h3>Crew</h3>
            <div className="detail-list">
              {(item.crew || []).length ? (
                item.crew.map((person) => (
                  <div key={`${person.id}-${person.job}`}>
                    <strong>{person.name}</strong>
                    <p>{person.job}</p>
                  </div>
                ))
              ) : (
                <p>No crew details available.</p>
              )}
            </div>
          </div>

          <div className="detail-card">
            <h3>Community Reviews</h3>
            {reviews.length ? (
              reviews.map((review) => (
                <article className="review-item" key={review.id}>
                  <strong>{review.author_name}</strong>
                  <p>{review.rating} / 10</p>
                  <p>{review.content}</p>
                </article>
              ))
            ) : (
              <p>No reviews yet. Be the first one.</p>
            )}

            <h3>Write a Review</h3>
            {user ? (
              <>
                <p className="auth-inline-note">Posting as {user.username}</p>
                {error ? <div className="status-banner error">{error}</div> : null}
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label htmlFor="rating">Rating</label>
                    <select
                      id="rating"
                      value={formState.rating}
                      onChange={(event) => setFormState((current) => ({ ...current, rating: Number(event.target.value) }))}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="content">Review</label>
                    <textarea
                      id="content"
                      value={formState.content}
                      onChange={(event) => setFormState((current) => ({ ...current, content: event.target.value }))}
                    />
                  </div>

                  <div className="button-row">
                    <button className="primary-button" type="submit" disabled={submitting}>
                      {submitting ? "Posting..." : "Post review"}
                    </button>
                  </div>
              </form>
              </>
            ) : (
              <div className="auth-callout">
                <p>Sign in to post reviews, track watched titles, build watchlists, and rate how much you liked a title out of 5.</p>
                <button className="primary-button" type="button" onClick={onRequireAuth}>
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
