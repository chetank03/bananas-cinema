import { useEffect, useState } from "react";
import { createReview, fetchGenres, fetchHome, fetchReviews, fetchTitleDetails, searchTitles } from "./api/movies";
import { DetailPanel } from "./components/DetailPanel";
import { MediaGrid } from "./components/MediaGrid";
import { SearchPanel } from "./components/SearchPanel";
import { useLocalFavorites } from "./hooks/useLocalFavorites";
import "./App.css";

const EMPTY_HOME = {
  trending: [],
  popular_movies: [],
  popular_tv: [],
  upcoming_movies: [],
};

function App() {
  const [genres, setGenres] = useState([]);
  const [home, setHome] = useState(EMPTY_HOME);
  const [results, setResults] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [queryState, setQueryState] = useState({ query: "", media_type: "all", genre: "", year: "" });
  const [loadingHome, setLoadingHome] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const { favorites, isFavorite, toggleFavorite } = useLocalFavorites();

  useEffect(() => {
    async function bootstrap() {
      try {
        const [homeData, genreData] = await Promise.all([fetchHome(), fetchGenres()]);
        setHome(homeData);
        setGenres(genreData.genres);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoadingHome(false);
      }
    }

    bootstrap();
  }, []);

  async function handleSearch(nextQueryState) {
    setSearching(true);
    setError("");
    setQueryState(nextQueryState);
    const hasActiveSearch =
      Boolean(nextQueryState.query) ||
      Boolean(nextQueryState.genre) ||
      Boolean(nextQueryState.year) ||
      nextQueryState.media_type !== "all";
    try {
      const data = await searchTitles(nextQueryState);
      setResults(data.results);
      setSearched(hasActiveSearch);
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
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
    if (!selectedTitle) {
      return;
    }

    const review = await createReview(selectedTitle.media_type, selectedTitle.id, {
      ...payload,
      title_snapshot: selectedTitle.title,
    });
    setSelectedReviews((current) => [review, ...current]);
  }

  const featuredCollections = [
    { key: "favorites", title: "Saved Picks", items: favorites },
    { key: "trending", title: "Trending This Week", items: home.trending },
    { key: "popular_movies", title: "Popular Movies", items: home.popular_movies },
    { key: "popular_tv", title: "Popular Series", items: home.popular_tv },
    { key: "upcoming_movies", title: "Upcoming Releases", items: home.upcoming_movies },
  ];

  return (
    <div className="app-shell">
      <div className="backdrop-glow backdrop-glow-left" />
      <div className="backdrop-glow backdrop-glow-right" />

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Bananas Cinema</p>
          <h1>Find the next film or series worth staying up for.</h1>
          <p className="hero-text">
            Search TMDb-powered movie and TV data, browse what is trending, and keep a short list of titles you want
            to revisit.
          </p>
          <div className="hero-stats">
            <div>
              <span>{home.trending.length || "--"}</span>
              <p>Trending picks</p>
            </div>
            <div>
              <span>{favorites.length}</span>
              <p>Saved locally</p>
            </div>
            <div>
              <span>{genres.length || "--"}</span>
              <p>Genres loaded</p>
            </div>
          </div>
        </div>

        <SearchPanel initialValues={queryState} genres={genres} onSearch={handleSearch} searching={searching} />
      </header>

      {error ? <div className="status-banner error">{error}</div> : null}
      {loadingHome ? <div className="status-banner">Loading Bananas Cinema...</div> : null}
      {loadingDetails ? <div className="status-banner">Loading title details...</div> : null}

      {searched ? (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="section-label">Search Results</p>
              <h2>
                {results.length ? `${results.length} match${results.length === 1 ? "" : "es"} found` : "No results"}
              </h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setSearched(false)}>
              Back to featured sections
            </button>
          </div>

          <MediaGrid
            items={results}
            emptyMessage="Try a different title, genre, or year filter."
            onOpenDetails={handleOpenDetails}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
          />
        </section>
      ) : (
        featuredCollections.map((section) => (
          <section className="content-section" key={section.key}>
            <div className="section-heading">
              <div>
                <p className="section-label">{section.key === "favorites" ? "Your List" : "Featured"}</p>
                <h2>{section.title}</h2>
              </div>
            </div>
            <MediaGrid
              items={section.items}
              emptyMessage={
                section.key === "favorites" ? "Save a few titles and they will show up here." : "Nothing to show yet."
              }
              onOpenDetails={handleOpenDetails}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          </section>
        ))
      )}

      <DetailPanel
        item={selectedTitle}
        reviews={selectedReviews}
        onClose={() => setSelectedTitle(null)}
        onCreateReview={handleCreateReview}
        onToggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
      />
    </div>
  );
}

export default App;
