import { useEffect, useState } from "react";

const STORAGE_KEY = "bananas-cinema-favorites";


function toFavoriteItem(item) {
  return {
    id: item.id,
    media_type: item.media_type,
    title: item.title,
    year: item.year || "",
    rating: item.rating || 0,
    poster_url: item.poster_url || "",
    overview: item.overview || "",
  };
}


export function useLocalFavorites() {
  const [favorites, setFavorites] = useState(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    try {
      return JSON.parse(storedValue);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  function isFavorite(item) {
    return favorites.some((favorite) => favorite.id === item.id && favorite.media_type === item.media_type);
  }

  function toggleFavorite(item) {
    setFavorites((current) => {
      const exists = current.some((favorite) => favorite.id === item.id && favorite.media_type === item.media_type);
      if (exists) {
        return current.filter((favorite) => !(favorite.id === item.id && favorite.media_type === item.media_type));
      }
      return [toFavoriteItem(item), ...current];
    });
  }

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}
