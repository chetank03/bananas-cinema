import { getStoredToken } from "./auth";
import { requestJson } from "./client";

async function request(path, options = {}) {
  const token = getStoredToken();
  return requestJson(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
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

export function fetchFavorites() {
  return request("/favorites/");
}

export function saveFavorite(payload) {
  return request("/favorites/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFavorite(favoriteId) {
  return request(`/favorites/${favoriteId}/`, {
    method: "DELETE",
  });
}

export function fetchWatchlists() {
  return request("/watchlists/");
}

export function createWatchlist(payload) {
  return request("/watchlists/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWatchlist(watchlistId, payload) {
  return request(`/watchlists/${watchlistId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteWatchlist(watchlistId) {
  return request(`/watchlists/${watchlistId}/`, {
    method: "DELETE",
  });
}

export function addWatchlistItem(watchlistId, payload) {
  return request(`/watchlists/${watchlistId}/items/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteWatchlistItem(watchlistId, itemId) {
  return request(`/watchlists/${watchlistId}/items/${itemId}/`, {
    method: "DELETE",
  });
}
