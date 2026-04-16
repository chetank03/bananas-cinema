import { useEffect, useRef, useState } from "react";


export function SearchPanel({ initialValues, genres, onSearch }) {
  const [formState, setFormState] = useState(initialValues);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setFormState(initialValues);
  }, [initialValues]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onSearchRef.current(formState);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [formState]);

  function handleChange(key, value) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(formState);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSearch(formState);
    }
  }

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field search-field-query">
          <label htmlFor="query">Title</label>
          <input
            id="query"
            type="text"
            placeholder="The Studio, Dune, Sinners..."
            value={formState.query}
            onChange={(event) => handleChange("query", event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="field search-field-media-type">
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

        <div className="field search-field-genre">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            value={formState.genre}
            onChange={(event) => handleChange("genre", event.target.value)}
          >
            <option value="">Any genre</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
