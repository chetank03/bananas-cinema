import { useEffect, useState } from "react";


export function SearchPanel({ initialValues, genres, onSearch, searching }) {
  const [formState, setFormState] = useState(initialValues);

  useEffect(() => {
    setFormState(initialValues);
  }, [initialValues]);

  function handleChange(key, value) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(formState);
  }

  function handleReset() {
    const emptyState = { query: "", media_type: "all", genre: "", year: "" };
    setFormState(emptyState);
    onSearch(emptyState);
  }

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <h2>Search the catalog</h2>
      <p>Search by title, then narrow by media type, genre, or release year.</p>

      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="query">Title</label>
          <input
            id="query"
            type="text"
            placeholder="The Bear, Dune, Sinners..."
            value={formState.query}
            onChange={(event) => handleChange("query", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="media_type">Media type</label>
          <select
            id="media_type"
            value={formState.media_type}
            onChange={(event) => handleChange("media_type", event.target.value)}
          >
            <option value="all">All</option>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="genre">Genre</label>
          <select id="genre" value={formState.genre} onChange={(event) => handleChange("genre", event.target.value)}>
            <option value="">Any</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field field-full">
          <label htmlFor="year">Release year</label>
          <input
            id="year"
            inputMode="numeric"
            maxLength={4}
            placeholder="2024"
            value={formState.year}
            onChange={(event) => handleChange("year", event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      </div>

      <div className="button-row">
        <button className="primary-button" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
        <button className="ghost-button" type="button" onClick={handleReset}>
          Clear
        </button>
      </div>
    </form>
  );
}
