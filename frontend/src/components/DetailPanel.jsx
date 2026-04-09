import { useEffect, useState } from "react";


export function DetailPanel({ item, reviews, onClose, onCreateReview, onToggleFavorite, isFavorite }) {
  const [formState, setFormState] = useState({ author_name: "", rating: 8, content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormState({ author_name: "", rating: 8, content: "" });
    setError("");
    setSubmitting(false);
  }, [item]);

  if (!item) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await onCreateReview(formState);
      setFormState({ author_name: "", rating: 8, content: "" });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
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
            <button className="favorite-button" type="button" onClick={() => onToggleFavorite(item)}>
              {isFavorite(item) ? "Saved" : "Save"}
            </button>
            {item.trailer_url ? (
              <a className="primary-button inline-link" href={item.trailer_url} target="_blank" rel="noreferrer">
                Watch trailer
              </a>
            ) : null}
            <button className="ghost-button" type="button" onClick={onClose}>
              Close
            </button>
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
            {error ? <div className="status-banner error">{error}</div> : null}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="author_name">Your name</label>
                <input
                  id="author_name"
                  value={formState.author_name}
                  onChange={(event) => setFormState((current) => ({ ...current, author_name: event.target.value }))}
                />
              </div>

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
          </div>
        </div>
      </aside>
    </div>
  );
}
