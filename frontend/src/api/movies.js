const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }
  return data;
}

export function fetchHome() {
  return request("/home/");
}

export function fetchGenres() {
  return request("/genres/");
}

export function searchTitles(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  return request(`/search/?${searchParams.toString()}`);
}

export function fetchTitleDetails(mediaType, tmdbId) {
  return request(`/titles/${mediaType}/${tmdbId}/`);
}

export function fetchReviews(mediaType, tmdbId) {
  return request(`/reviews/${mediaType}/${tmdbId}/`);
}

export function createReview(mediaType, tmdbId, payload) {
  return request(`/reviews/${mediaType}/${tmdbId}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
