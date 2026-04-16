import { useEffect, useRef, useState } from "react";
import { fetchCurrentUser, login, loginWithGoogle, logout, signup } from "./api/auth";
import {
  addWatchlistItem,
  createReview,
  createWatchlist,
  deleteFavorite,
  deleteWatchlist,
  deleteWatchlistItem,
  fetchFavorites,
  fetchGenres,
  fetchHome,
  fetchReviews,
  fetchTitleDetails,
  fetchWatchlists,
  saveFavorite,
  searchTitles,
  updateWatchlist,
} from "./api/movies";
import { AuthModal } from "./components/AuthModal";
import { DetailPanel } from "./components/DetailPanel";
import { LibraryPage } from "./components/LibraryPage";
import { MediaGrid } from "./components/MediaGrid";
import { SearchPanel } from "./components/SearchPanel";
import { WatchlistsModal } from "./components/WatchlistsModal";
import { WatchlistsPage } from "./components/WatchlistsPage";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

const EMPTY_HOME = {
  trending: [],
  popular_movies: [],
  popular_tv: [],
  upcoming_movies: [],
};

function SunIcon() {
  return (
    <svg aria-hidden="true" className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19.5 14.8A8.5 8.5 0 0 1 9.2 4.5a8.5 8.5 0 1 0 10.3 10.3Z" />
    </svg>
  );
}

function getCurrentPage() {
  if (window.location.pathname === "/watchlists") {
    return "watchlists";
  }
  if (window.location.pathname === "/library") {
    return "library";
  }
  return "home";
}

function favoriteToMediaItem(favorite) {
  return {
    id: favorite.tmdb_id,
    media_type: favorite.media_type,
    title: favorite.title,
    year: favorite.year,
    rating: favorite.rating,
    personal_rating: favorite.personal_rating,
    poster_url: favorite.poster_url,
    overview: favorite.overview,
    watch_later: favorite.watch_later,
    created_at: favorite.created_at,
  };
}

function App() {
  const [genres, setGenres] = useState([]);
  const [home, setHome] = useState(EMPTY_HOME);
  const [favorites, setFavorites] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [results, setResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [loadingMoreResults, setLoadingMoreResults] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [queryState, setQueryState] = useState({ query: "", media_type: "all", genre: "", year: "" });
  const [user, setUser] = useState(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [searched, setSearched] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [watchlistsOpen, setWatchlistsOpen] = useState(false);
  const [watchlistTarget, setWatchlistTarget] = useState(null);
  const [watchlistsLoading, setWatchlistsLoading] = useState(false);
  const [watchlistsError, setWatchlistsError] = useState("");
  const [currentPage, setCurrentPage] = useState(getCurrentPage);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [topbarScrolled, setTopbarScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const latestSearchRequestRef = useRef(0);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [homeData, genresData, meData] = await Promise.all([
          fetchHome(),
          fetchGenres(),
          fetchCurrentUser().catch(() => ({ authenticated: false })),
        ]);
        setHome(homeData);
        setGenres(genresData.genres || []);
        if (meData.authenticated) {
          setUser(meData.user);
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoadingHome(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    function handlePopState() {
      setCurrentPage(getCurrentPage());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 420);
      setTopbarScrolled(window.scrollY > 18);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const shouldLockScroll = Boolean(selectedTitle || authOpen || watchlistsOpen);
    const { overflow } = document.body.style;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [selectedTitle, authOpen, watchlistsOpen]);

  useEffect(() => {
    if (!user && (currentPage === "watchlists" || currentPage === "library")) {
      navigateTo("home");
    }
  }, [currentPage, user]);

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setFavorites([]);
        return;
      }
      try {
        const data = await fetchFavorites();
        setFavorites(data.favorites);
      } catch (favoritesError) {
        setError(favoritesError.message);
      }
    }

    loadFavorites();
  }, [user]);

  useEffect(() => {
    async function loadWatchlists() {
      if (!user) {
        setWatchlists([]);
        return;
      }
      try {
        const data = await fetchWatchlists();
        setWatchlists(data.watchlists);
      } catch (watchlistsLoadError) {
        setError(watchlistsLoadError.message);
      }
    }

    loadWatchlists();
  }, [user]);

  async function handleSearch(nextQueryState, options = {}) {
    const page = options.page ?? 1;
    const append = options.append ?? false;
    setError("");
    setQueryState(nextQueryState);
    const hasActiveSearch =
      Boolean(nextQueryState.query) ||
      Boolean(nextQueryState.genre) ||
      Boolean(nextQueryState.year) ||
      nextQueryState.media_type !== "all";

    if (!hasActiveSearch) {
      setResults([]);
      setSearchPage(1);
      setHasMoreResults(false);
      setSearched(false);
      return;
    }

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;
    if (append) {
      setLoadingMoreResults(true);
    }

    try {
      const data = await searchTitles({ ...nextQueryState, page });
      if (latestSearchRequestRef.current !== requestId) {
        return;
      }
      setResults((current) => (append ? [...current, ...data.results] : data.results));
      setSearchPage(data.page);
      setHasMoreResults(Boolean(data.has_more));
      setSearched(hasActiveSearch);
    } catch (searchError) {
      if (latestSearchRequestRef.current === requestId) {
        setError(searchError.message);
      }
    } finally {
      if (latestSearchRequestRef.current === requestId) {
        setLoadingMoreResults(false);
      }
    }
  }

  function handleLoadMoreResults() {
    handleSearch(queryState, { page: searchPage + 1, append: true });
  }

  async function handleOpenDetails(item) {
    setLoadingDetails(true);
    setError("");
    try {
      const [details, reviewData] = await Promise.all([
        fetchTitleDetails(item.media_type, item.id),
        fetchReviews(item.media_type, item.id),
      ]);
      setSelectedTitle(details);
      setSelectedReviews(reviewData.reviews);
    } catch (detailError) {
      setError(detailError.message);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleCreateReview(payload) {
    if (!user) {
      openAuth("login");
      throw new Error("Sign in to post a review.");
    }

    if (!selectedTitle) {
      return;
    }

    const review = await createReview(selectedTitle.media_type, selectedTitle.id, {
      ...payload,
      title_snapshot: selectedTitle.title,
    });
    setSelectedReviews((current) => [review, ...current]);
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  }

  function navigateTo(page) {
    const nextPath = page === "watchlists" ? "/watchlists" : page === "library" ? "/library" : "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setCurrentPage(page);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openWatchlists(item = null) {
    if (!user) {
      openAuth("login");
      return;
    }
    if (!item) {
      navigateTo("watchlists");
      return;
    }
    setWatchlistTarget(item);
    setWatchlistsError("");
    setWatchlistsOpen(true);
  }

  function closeWatchlists() {
    setWatchlistsOpen(false);
    setWatchlistTarget(null);
    setWatchlistsError("");
  }

  function upsertWatchlist(updatedWatchlist) {
    setWatchlists((current) => {
      const exists = current.some((watchlist) => watchlist.id === updatedWatchlist.id);
      if (exists) {
        return current.map((watchlist) => (watchlist.id === updatedWatchlist.id ? updatedWatchlist : watchlist));
      }
      return [...current, updatedWatchlist];
    });
  }

  async function handleAuthSubmit(payload) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const authData = authMode === "signup" ? await signup(payload) : await login(payload);
      setUser(authData.user);
      setAuthOpen(false);
    } catch (submitError) {
      setAuthError(submitError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const authData = await loginWithGoogle();
      setUser(authData.user);
      setAuthOpen(false);
    } catch (submitError) {
      setAuthError(submitError.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setError("");
    try {
      await logout();
      setAccountMenuOpen(false);
      setUser(null);
      setFavorites([]);
      setWatchlists([]);
      closeWatchlists();
      navigateTo("home");
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  function favoriteRecordFor(item) {
    return favorites.find((favorite) => favorite.tmdb_id === item.id && favorite.media_type === item.media_type) || null;
  }

  function isFavorite(item) {
    return Boolean(favoriteRecordFor(item));
  }

  async function handleToggleFavorite(item) {
    if (!user) {
      openAuth("login");
      return;
    }

    const existingFavorite = favoriteRecordFor(item);
    try {
      if (existingFavorite) {
        await deleteFavorite(existingFavorite.id);
        setFavorites((current) => current.filter((favorite) => favorite.id !== existingFavorite.id));
      } else {
        const favorite = await saveFavorite({
          tmdb_id: item.id,
          media_type: item.media_type,
          title: item.title,
          poster_url: item.poster_url || "",
          overview: item.overview || "",
          year: item.year || "",
          rating: item.rating || 0,
          personal_rating: null,
        });
        setFavorites((current) => [favorite, ...current]);
      }
    } catch (favoriteError) {
      setError(favoriteError.message);
    }
  }

  async function handleSaveFavorite(item, personalRating) {
    if (!user) {
      openAuth("login");
      throw new Error("Sign in to save favorites.");
    }

    const favorite = await saveFavorite({
      tmdb_id: item.id,
      media_type: item.media_type,
      title: item.title,
      poster_url: item.poster_url || "",
      overview: item.overview || "",
      year: item.year || "",
      rating: item.rating || 0,
      personal_rating: personalRating,
      watch_later: false,
    });

    setFavorites((current) => {
      const exists = current.some((entry) => entry.id === favorite.id);
      if (exists) {
        return current.map((entry) => (entry.id === favorite.id ? favorite : entry));
      }
      return [favorite, ...current];
    });
  }

  async function handleSaveWatchLater(item) {
    if (!user) {
      openAuth("login");
      throw new Error("Sign in to use watch later.");
    }

    const existingFavorite = favoriteRecordFor(item);
    const favorite = await saveFavorite({
      tmdb_id: item.id,
      media_type: item.media_type,
      title: item.title,
      poster_url: item.poster_url || "",
      overview: item.overview || "",
      year: item.year || "",
      rating: item.rating || 0,
      personal_rating: existingFavorite?.personal_rating ?? null,
      watch_later: true,
    });

    setFavorites((current) => {
      const exists = current.some((entry) => entry.id === favorite.id);
      if (exists) {
        return current.map((entry) => (entry.id === favorite.id ? favorite : entry));
      }
      return [favorite, ...current];
    });
  }

  async function handleRemoveFavorite(item) {
    const existingFavorite = favoriteRecordFor(item);
    if (!existingFavorite) {
      return;
    }

    await deleteFavorite(existingFavorite.id);
    setFavorites((current) => current.filter((favorite) => favorite.id !== existingFavorite.id));
  }

  async function handleCreateWatchlist(name) {
    setWatchlistsLoading(true);
    setWatchlistsError("");
    try {
      const watchlist = await createWatchlist({ name });
      upsertWatchlist(watchlist);
      return watchlist;
    } catch (watchlistError) {
      setWatchlistsError(watchlistError.message);
      throw watchlistError;
    } finally {
      setWatchlistsLoading(false);
    }
  }

  async function handleRenameWatchlist(watchlistId, name) {
    setWatchlistsLoading(true);
    setWatchlistsError("");
    try {
      const watchlist = await updateWatchlist(watchlistId, { name });
      upsertWatchlist(watchlist);
    } catch (watchlistError) {
      setWatchlistsError(watchlistError.message);
      throw watchlistError;
    } finally {
      setWatchlistsLoading(false);
    }
  }

  async function handleDeleteWatchlist(watchlistId) {
    setWatchlistsLoading(true);
    setWatchlistsError("");
    try {
      await deleteWatchlist(watchlistId);
      setWatchlists((current) => current.filter((watchlist) => watchlist.id !== watchlistId));
    } catch (watchlistError) {
      setWatchlistsError(watchlistError.message);
      throw watchlistError;
    } finally {
      setWatchlistsLoading(false);
    }
  }

  async function handleAddItemToWatchlist(watchlistId, item) {
    setWatchlistsLoading(true);
    setWatchlistsError("");
    try {
      const watchlist = await addWatchlistItem(watchlistId, {
        tmdb_id: item.id,
        media_type: item.media_type,
        title: item.title,
        poster_url: item.poster_url || "",
        overview: item.overview || "",
        year: item.year || "",
        rating: item.rating || 0,
      });
      upsertWatchlist(watchlist);
    } catch (watchlistError) {
      setWatchlistsError(watchlistError.message);
      throw watchlistError;
    } finally {
      setWatchlistsLoading(false);
    }
  }

  async function handleRemoveItemFromWatchlist(watchlistId, itemId) {
    setWatchlistsLoading(true);
    setWatchlistsError("");
    try {
      await deleteWatchlistItem(watchlistId, itemId);
      setWatchlists((current) =>
        current.map((watchlist) =>
          watchlist.id === watchlistId
            ? {
                ...watchlist,
                items: watchlist.items.filter((entry) => entry.id !== itemId),
                item_count: watchlist.items.filter((entry) => entry.id !== itemId).length,
              }
            : watchlist,
        ),
      );
    } catch (watchlistError) {
      setWatchlistsError(watchlistError.message);
      throw watchlistError;
    } finally {
      setWatchlistsLoading(false);
    }
  }

  const watchedFavorites = favorites.filter((favorite) => !favorite.watch_later);
  const watchLaterFavorites = favorites.filter((favorite) => favorite.watch_later);

  const featuredCollections = [
    {
      key: "watch_later",
      title: "Watch Later",
      description: user
        ? "Titles you parked for the next free night."
        : "Sign in to build a watch later queue.",
      items: watchLaterFavorites.map(favoriteToMediaItem),
    },
    {
      key: "favorites",
      title: "Watched",
      description: user
        ? "Titles you've already watched and rated."
        : "Sign in to keep track of what you've watched.",
      items: watchedFavorites.map(favoriteToMediaItem),
    },
    {
      key: "trending",
      title: "Trending This Week",
      description: "What audiences are opening first right now.",
      items: home.trending,
    },
    {
      key: "popular_movies",
      title: "Popular Movies",
      description: "Big-screen titles getting the most attention.",
      items: home.popular_movies,
    },
    {
      key: "popular_tv",
      title: "Popular Series",
      description: "Bingeable shows worth keeping on your radar.",
      items: home.popular_tv,
    },
    {
      key: "upcoming_movies",
      title: "Upcoming Releases",
      description: "Fresh releases lining up for the next watchlist update.",
      items: home.upcoming_movies,
    },
  ];

  return (
    <div className="app-shell">
      <div className="backdrop-glow backdrop-glow-left" />
      <div className="backdrop-glow backdrop-glow-right" />

      <header className={`topbar${topbarScrolled ? " topbar-scrolled" : ""}`}>
        <div className="topbar-main">
          <div className="brand">
            <button className="brand-logo-wrap" type="button" onClick={() => navigateTo("home")} aria-label="Go to home">
              <img className="brand-logo" src="/brand-mark.png" alt="Bananas Cinema" />
            </button>
          </div>

          {currentPage === "home" ? (
            <div className="topbar-search">
              <SearchPanel initialValues={queryState} genres={genres} onSearch={handleSearch} />
            </div>
          ) : null}

          <div className="topbar-actions">
            <button
              className="ghost-button theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            {user ? (
              <>
                <button className="ghost-button" type="button" onClick={() => navigateTo("library")}>
                  Library
                </button>
                <button className="ghost-button" type="button" onClick={() => openWatchlists()}>
                  Watchlists
                </button>
                <div className={`account-menu${accountMenuOpen ? " account-menu-open" : ""}`} ref={accountMenuRef}>
                  <button
                    className="user-badge"
                    type="button"
                    onClick={() => setAccountMenuOpen((current) => !current)}
                    aria-haspopup="menu"
                    aria-expanded={accountMenuOpen}
                  >
                    <span>{user.username}</span>
                    <span className="account-menu-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {accountMenuOpen ? (
                    <div className="account-menu-panel" role="menu">
                      <button className="account-menu-item" type="button" role="menuitem" onClick={handleLogout}>
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <button className="ghost-button" type="button" onClick={() => openAuth("login")}>
                  Sign in
                </button>
                <button className="primary-button" type="button" onClick={() => openAuth("signup")}>
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {error ? <div className="status-banner error">{error}</div> : null}
      {loadingHome ? <div className="status-banner">Loading Bananas Cinema...</div> : null}
      {loadingDetails ? <div className="status-banner">Loading title details...</div> : null}

      {currentPage === "watchlists" ? (
        <WatchlistsPage
          user={user}
          watchlists={watchlists}
          loading={watchlistsLoading}
          error={watchlistsError}
          onBack={() => navigateTo("home")}
          onCreateWatchlist={handleCreateWatchlist}
          onRenameWatchlist={handleRenameWatchlist}
          onDeleteWatchlist={handleDeleteWatchlist}
          onRemoveItem={handleRemoveItemFromWatchlist}
          onOpenDetails={handleOpenDetails}
        />
      ) : currentPage === "library" ? (
        <LibraryPage
          user={user}
          watchedItems={featuredCollections.find((section) => section.key === "favorites")?.items || []}
          watchLaterItems={featuredCollections.find((section) => section.key === "watch_later")?.items || []}
          onBack={() => navigateTo("home")}
          onOpenDetails={handleOpenDetails}
          onToggleFavorite={handleToggleFavorite}
          onMoveToWatched={(item) => handleSaveFavorite(item, item.personal_rating ?? null)}
          onMoveToWatchLater={handleSaveWatchLater}
          isFavorite={isFavorite}
        />
      ) : (
        <>
          {searched ? (
            <section className="content-section">
              <MediaGrid
                items={results}
                emptyMessage="Try a different title, genre, or year filter."
                onOpenDetails={handleOpenDetails}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite}
              />
              {hasMoreResults ? (
                <div className="search-results-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={handleLoadMoreResults}
                    disabled={loadingMoreResults}
                  >
                    {loadingMoreResults ? "Loading..." : "Load more"}
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            featuredCollections.map((section) => (
              <section className="content-section" key={section.key}>
                <div className="section-heading">
                  <div className="section-copy">
                    <p className="section-label">
                      {section.key === "favorites" || section.key === "watch_later" ? "Your List" : "Featured"}
                    </p>
                    <h2>{section.title}</h2>
                    <p className="section-description">{section.description}</p>
                  </div>
                </div>
                <MediaGrid
                  items={section.items}
                  emptyMessage={
                    section.key === "favorites" || section.key === "watch_later"
                      ? user
                        ? section.key === "watch_later"
                          ? "Mark a few titles as watch later and they will show up here."
                          : "Mark a few titles as watched and they will show up here."
                        : "Sign in to save titles to your account."
                      : "Nothing to show yet."
                  }
                  onOpenDetails={handleOpenDetails}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorite={isFavorite}
                  compact={section.key === "favorites" || section.key === "watch_later"}
                  slider
                />
              </section>
            ))
          )}
        </>
      )}

      <DetailPanel
        item={selectedTitle}
        reviews={selectedReviews}
        user={user}
        favorite={selectedTitle ? favoriteRecordFor(selectedTitle) : null}
        onClose={() => setSelectedTitle(null)}
        onCreateReview={handleCreateReview}
        onToggleFavorite={handleToggleFavorite}
        onSaveFavorite={handleSaveFavorite}
        onSaveWatchLater={handleSaveWatchLater}
        onOpenWatchlists={openWatchlists}
        onRemoveFavorite={handleRemoveFavorite}
        onRequireAuth={() => openAuth("login")}
        isFavorite={isFavorite}
      />

      <WatchlistsModal
        open={watchlistsOpen}
        onClose={closeWatchlists}
        activeItem={watchlistTarget}
        watchlists={watchlists}
        loading={watchlistsLoading}
        error={watchlistsError}
        onCreateWatchlist={handleCreateWatchlist}
        onRenameWatchlist={handleRenameWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        onAddItem={handleAddItemToWatchlist}
        onRemoveItem={handleRemoveItemFromWatchlist}
      />

      <AuthModal
        key={authMode}
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSubmit={handleAuthSubmit}
        onGoogleSignIn={handleGoogleAuth}
        onModeChange={setAuthMode}
        loading={authLoading}
        error={authError}
      />

      {currentPage === "home" && showBackToTop ? (
        <button className="back-to-top-button" type="button" onClick={scrollToTop} aria-label="Back to top">
          ↑
        </button>
      ) : null}
    </div>
  );
}

export default App;
