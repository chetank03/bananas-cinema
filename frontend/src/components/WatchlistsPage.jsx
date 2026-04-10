import { useMemo, useState } from "react";

export function WatchlistsPage({
  user,
  watchlists,
  loading,
  error,
  onBack,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onRemoveItem,
  onOpenDetails,
}) {
  const [newName, setNewName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState({});

  const watchlistsSorted = useMemo(
    () => [...watchlists].sort((left, right) => left.name.localeCompare(right.name)),
    [watchlists],
  );

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    try {
      await onCreateWatchlist(trimmed);
      setNewName("");
    } catch {
      return;
    }
  }

  async function handleRename(watchlistId) {
    const draft = (renameDrafts[watchlistId] || "").trim();
    if (!draft) {
      return;
    }
    try {
      await onRenameWatchlist(watchlistId, draft);
      setRenameDrafts((current) => ({ ...current, [watchlistId]: "" }));
    } catch {
      return;
    }
  }

  async function handleDelete(watchlistId) {
    try {
      await onDeleteWatchlist(watchlistId);
    } catch {
      return;
    }
  }

  async function handleRemove(watchlistId, itemId) {
    try {
      await onRemoveItem(watchlistId, itemId);
    } catch {
      return;
    }
  }

  return (
    <section className="watchlists-page">
      <div className="section-heading watchlists-page-heading">
        <div className="section-copy">
          <p className="section-label">Your Lists</p>
          <h1>Watchlists</h1>
          <p className="section-description">
            {user
              ? "Build custom queues, rename them, and clean up titles without leaving the page."
              : "Sign in to build and manage custom watchlists."}
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          Back to home
        </button>
      </div>

      {error ? <div className="status-banner error">{error}</div> : null}

      {user ? (
        <>
          <form className="watchlist-create-form watchlists-page-create" onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="watchlist-page-name">New watchlist name</label>
              <input
                id="watchlist-page-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Friday Night Picks"
              />
            </div>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Working..." : "Create watchlist"}
            </button>
          </form>

          {watchlistsSorted.length ? (
            <div className="watchlists-stack watchlists-page-stack">
              {watchlistsSorted.map((watchlist) => (
                <article className="watchlist-card" key={watchlist.id}>
                  <div className="watchlist-card-header">
                    <div>
                      <h3>{watchlist.name}</h3>
                      <p>{watchlist.item_count} item{watchlist.item_count === 1 ? "" : "s"}</p>
                    </div>
                  </div>

                  <div className="watchlist-rename-row">
                    <input
                      value={renameDrafts[watchlist.id] ?? ""}
                      onChange={(event) => setRenameDrafts((current) => ({ ...current, [watchlist.id]: event.target.value }))}
                      placeholder="Rename watchlist"
                    />
                    <button className="ghost-button" type="button" disabled={loading} onClick={() => handleRename(watchlist.id)}>
                      Rename
                    </button>
                    <button className="ghost-button" type="button" disabled={loading} onClick={() => handleDelete(watchlist.id)}>
                      Delete
                    </button>
                  </div>

                  {watchlist.items.length ? (
                    <div className="watchlist-items">
                      {watchlist.items.map((entry) => (
                        <div className="watchlist-item-card" key={entry.id}>
                          <button
                            className="watchlist-item-main"
                            type="button"
                            onClick={() =>
                              onOpenDetails({
                                id: entry.tmdb_id,
                                media_type: entry.media_type,
                                title: entry.title,
                                year: entry.year,
                                rating: entry.rating,
                                poster_url: entry.poster_url,
                                overview: entry.overview,
                              })
                            }
                          >
                            <div className="watchlist-item-poster">
                              {entry.poster_url ? (
                                <img src={entry.poster_url} alt={entry.title} />
                              ) : (
                                <div className="watchlist-item-poster-fallback">{entry.title.slice(0, 1)}</div>
                              )}
                            </div>
                            <div className="watchlist-item-copy">
                              <strong>{entry.title}</strong>
                              <p>
                                {entry.year || "TBA"} • {entry.media_type === "movie" ? "Movie" : "TV"}
                              </p>
                            </div>
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={loading}
                            onClick={() => handleRemove(watchlist.id, entry.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No titles in this watchlist yet.</div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Create your first watchlist to start organizing titles.</div>
          )}
        </>
      ) : (
        <div className="auth-callout">
          <p className="auth-copy">Sign in to create watchlists, sort titles into different queues, and manage them from one page.</p>
          <button className="primary-button" type="button" onClick={onBack}>
            Back to home
          </button>
        </div>
      )}
    </section>
  );
}
