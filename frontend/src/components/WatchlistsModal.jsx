import { useMemo, useState } from "react";

export function WatchlistsModal({
  open,
  onClose,
  activeItem,
  watchlists,
  loading,
  error,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onAddItem,
  onRemoveItem,
}) {
  const [newName, setNewName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState({});

  const watchlistsSorted = useMemo(
    () => [...watchlists].sort((left, right) => left.name.localeCompare(right.name)),
    [watchlists],
  );

  if (!open) {
    return null;
  }

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    try {
      const watchlist = await onCreateWatchlist(trimmed);
      if (activeItem && watchlist) {
        await onAddItem(watchlist.id, activeItem);
      }
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

  async function handleAdd(watchlistId) {
    if (!activeItem) {
      return;
    }
    try {
      await onAddItem(watchlistId, activeItem);
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
    <div className="auth-overlay" onClick={onClose} role="presentation">
      <div className="watchlists-modal" onClick={(event) => event.stopPropagation()}>
        <div className="auth-header">
          <div>
            <p className="section-label">{activeItem ? "Add to Watchlists" : "Manage Watchlists"}</p>
            <h2>{activeItem ? activeItem.title : "Your watchlists"}</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="auth-copy">
          {activeItem
            ? "Choose a watchlist for this title, or create a new one."
            : "Create, rename, and clean up your watchlists in one place."}
        </p>

        {error ? <div className="status-banner error">{error}</div> : null}

        <form className="watchlist-create-form" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="watchlist-name">New watchlist name</label>
            <input
              id="watchlist-name"
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
          <div className="watchlists-stack">
            {watchlistsSorted.map((watchlist) => {
              const selectedItem = activeItem
                ? watchlist.items.find((entry) => entry.tmdb_id === activeItem.id && entry.media_type === activeItem.media_type) || null
                : null;

              return (
                <article className="watchlist-card" key={watchlist.id}>
                  <div className="watchlist-card-header">
                    <div>
                      <h3>{watchlist.name}</h3>
                      <p>{watchlist.item_count} item{watchlist.item_count === 1 ? "" : "s"}</p>
                    </div>
                    {activeItem ? (
                      selectedItem ? (
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={loading}
                          onClick={() => handleRemove(watchlist.id, selectedItem.id)}
                        >
                          Remove
                        </button>
                      ) : (
                        <button className="favorite-button" type="button" disabled={loading} onClick={() => handleAdd(watchlist.id)}>
                          Add
                        </button>
                      )
                    ) : null}
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
                        <div className="watchlist-item" key={entry.id}>
                          <div>
                            <strong>{entry.title}</strong>
                            <p>{entry.year || "TBA"} • {entry.media_type === "movie" ? "Movie" : "TV"}</p>
                          </div>
                          <button className="ghost-button" type="button" disabled={loading} onClick={() => handleRemove(watchlist.id, entry.id)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">No titles in this watchlist yet.</div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">Create your first watchlist to start organizing titles.</div>
        )}
      </div>
    </div>
  );
}
