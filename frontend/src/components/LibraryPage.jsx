import { useMemo, useState } from "react";
import { MediaGrid } from "./MediaGrid";

export function LibraryPage({
  user,
  watchedItems,
  watchLaterItems,
  onBack,
  onOpenDetails,
  onToggleFavorite,
  onMoveToWatched,
  isFavorite,
}) {
  const [watchedSort, setWatchedSort] = useState("recent");

  const sortedWatchedItems = useMemo(() => {
    const items = [...watchedItems];

    if (watchedSort === "personal_rating") {
      return items.sort((left, right) => {
        const ratingDiff = (right.personal_rating ?? -1) - (left.personal_rating ?? -1);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        return (right.rating || 0) - (left.rating || 0);
      });
    }

    if (watchedSort === "community_rating") {
      return items.sort((left, right) => {
        const ratingDiff = (right.rating || 0) - (left.rating || 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }
        return (right.personal_rating ?? -1) - (left.personal_rating ?? -1);
      });
    }

    return items.sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime(),
    );
  }, [watchedItems, watchedSort]);

  return (
    <section className="library-page">
      <div className="section-heading library-page-heading">
        <div className="section-copy">
          <p className="section-label">Your Lists</p>
          <h1>Library</h1>
          <p className="section-description">
            {user
              ? "Browse just your watched titles and your watch later queue in one place."
              : "Sign in to build a personal library of watched titles and watch later picks."}
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          Back to home
        </button>
      </div>

      {user ? (
        <>
          <section className="content-section library-section">
            <div className="section-heading">
              <div className="section-copy">
                <p className="section-label">Your List</p>
                <h2>Watched</h2>
                <p className="section-description">Titles you've already seen and rated.</p>
              </div>
              <div className="library-sort">
                <label htmlFor="watched-sort">Sort by</label>
                <select id="watched-sort" value={watchedSort} onChange={(event) => setWatchedSort(event.target.value)}>
                  <option value="recent">Last watched</option>
                  <option value="personal_rating">My rating</option>
                  <option value="community_rating">Community score</option>
                </select>
              </div>
            </div>
            <MediaGrid
              items={sortedWatchedItems}
              emptyMessage="Mark a few titles as watched and they will show up here."
              onOpenDetails={onOpenDetails}
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite}
              compact
            />
          </section>

          <section className="content-section library-section">
            <div className="section-heading">
              <div className="section-copy">
                <p className="section-label">Your List</p>
                <h2>Watch Later</h2>
                <p className="section-description">Titles you parked for the next free night.</p>
              </div>
            </div>
            <MediaGrid
              items={watchLaterItems}
              emptyMessage="Mark a few titles as watch later and they will show up here."
              onOpenDetails={onOpenDetails}
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite}
              compact
              itemActions={(item) => (
                <button className="ghost-button library-action-button" type="button" onClick={() => onMoveToWatched(item)}>
                  Move to watched
                </button>
              )}
            />
          </section>
        </>
      ) : (
        <div className="auth-callout">
          <p className="auth-copy">Sign in to view your watched titles and your watch later queue on a dedicated page.</p>
          <button className="primary-button" type="button" onClick={onBack}>
            Back to home
          </button>
        </div>
      )}
    </section>
  );
}
