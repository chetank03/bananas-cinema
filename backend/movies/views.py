from collections import OrderedDict

import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Review


class TMDbError(Exception):
    pass


def _tmdb_get(path, params=None):
    if not settings.TMDB_API_KEY:
        raise TMDbError("TMDB_API_KEY is not configured.")

    response = requests.get(
        f"{settings.TMDB_BASE_URL}{path}",
        params={
            "api_key": settings.TMDB_API_KEY,
            "language": "en-US",
            **(params or {}),
        },
        timeout=15,
    )
    if response.status_code >= 400:
        raise TMDbError("TMDb request failed.")
    return response.json()


def _image_url(path):
    if not path:
        return ""
    return f"{settings.TMDB_IMAGE_BASE_URL}{path}"


def _year_for_item(item, media_type):
    date_value = item.get("release_date") if media_type == "movie" else item.get("first_air_date")
    if not date_value:
        return None
    return date_value[:4]


def _normalize_title(item, fallback_media_type=None):
    media_type = item.get("media_type") or fallback_media_type or "movie"
    if media_type not in {"movie", "tv"}:
        return None

    title = item.get("title") or item.get("name") or "Untitled"
    return {
        "id": item["id"],
        "media_type": media_type,
        "title": title,
        "overview": item.get("overview", ""),
        "poster_url": _image_url(item.get("poster_path")),
        "backdrop_url": _image_url(item.get("backdrop_path")),
        "release_date": item.get("release_date") or item.get("first_air_date") or "",
        "year": _year_for_item(item, media_type),
        "rating": item.get("vote_average") or 0,
        "vote_count": item.get("vote_count") or 0,
        "genre_ids": item.get("genre_ids", []),
    }


def _serialize_home_section(items, fallback_media_type=None, limit=12):
    serialized = []
    for item in items:
        normalized = _normalize_title(item, fallback_media_type=fallback_media_type)
        if normalized:
            serialized.append(normalized)
        if len(serialized) == limit:
            break
    return serialized


def _build_home_payload():
    trending = _tmdb_get("/trending/all/week")
    popular_movies = _tmdb_get("/movie/popular")
    popular_tv = _tmdb_get("/tv/popular")
    upcoming_movies = _tmdb_get("/movie/upcoming")

    return {
        "trending": _serialize_home_section(trending.get("results", [])),
        "popular_movies": _serialize_home_section(popular_movies.get("results", []), fallback_media_type="movie"),
        "popular_tv": _serialize_home_section(popular_tv.get("results", []), fallback_media_type="tv"),
        "upcoming_movies": _serialize_home_section(upcoming_movies.get("results", []), fallback_media_type="movie"),
    }


def _combined_genres():
    movie_genres = _tmdb_get("/genre/movie/list").get("genres", [])
    tv_genres = _tmdb_get("/genre/tv/list").get("genres", [])

    merged = OrderedDict()
    for genre in movie_genres + tv_genres:
        merged[genre["id"]] = {"id": genre["id"], "name": genre["name"]}
    return list(merged.values())


def _search_payload(query, media_type, genre, year):
    query = query.strip()
    if not query:
        return []

    genre_id = None
    if genre:
        try:
            genre_id = int(genre)
        except (TypeError, ValueError):
            raise TMDbError("Genre filter must be numeric.")

    if media_type == "movie":
        data = _tmdb_get("/search/movie", {"query": query, "include_adult": "false"})
        items = data.get("results", [])
    elif media_type == "tv":
        data = _tmdb_get("/search/tv", {"query": query, "include_adult": "false"})
        items = data.get("results", [])
    else:
        data = _tmdb_get("/search/multi", {"query": query, "include_adult": "false"})
        items = data.get("results", [])

    results = []
    for item in items:
        normalized = _normalize_title(item, fallback_media_type=media_type if media_type in {"movie", "tv"} else None)
        if not normalized:
            continue
        if genre_id and genre_id not in normalized["genre_ids"]:
            continue
        if year and normalized["year"] != str(year):
            continue
        results.append(normalized)

    return results[:18]


def _trailer_url(videos):
    for item in videos:
        if item.get("site") == "YouTube" and item.get("type") in {"Trailer", "Teaser"}:
            return f"https://www.youtube.com/watch?v={item['key']}"
    return ""


def _details_payload(media_type, tmdb_id):
    data = _tmdb_get(
        f"/{media_type}/{tmdb_id}",
        {"append_to_response": "credits,videos,similar"},
    )

    genres = [genre["name"] for genre in data.get("genres", [])]
    cast = [
        {
            "id": person["id"],
            "name": person["name"],
            "character": person.get("character", ""),
            "profile_url": _image_url(person.get("profile_path")),
        }
        for person in data.get("credits", {}).get("cast", [])[:10]
    ]
    crew = [
        {
            "id": person["id"],
            "name": person["name"],
            "job": person.get("job", ""),
        }
        for person in data.get("credits", {}).get("crew", [])
        if person.get("job") in {"Director", "Writer", "Screenplay", "Creator"}
    ][:8]

    return {
        "id": data["id"],
        "media_type": media_type,
        "title": data.get("title") or data.get("name") or "Untitled",
        "overview": data.get("overview", ""),
        "poster_url": _image_url(data.get("poster_path")),
        "backdrop_url": _image_url(data.get("backdrop_path")),
        "release_date": data.get("release_date") or data.get("first_air_date") or "",
        "rating": data.get("vote_average") or 0,
        "vote_count": data.get("vote_count") or 0,
        "runtime": data.get("runtime") or data.get("episode_run_time", [None])[0],
        "genres": genres,
        "cast": cast,
        "crew": crew,
        "trailer_url": _trailer_url(data.get("videos", {}).get("results", [])),
        "similar": _serialize_home_section(
            data.get("similar", {}).get("results", []),
            fallback_media_type=media_type,
            limit=8,
        ),
    }


def _serialize_review(review):
    return {
        "id": review.id,
        "author_name": review.author_name,
        "rating": review.rating,
        "content": review.content,
        "created_at": review.created_at.isoformat(),
    }


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
def home(request):
    try:
        return Response(_build_home_payload())
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET"])
def genres(request):
    try:
        return Response({"genres": _combined_genres()})
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET"])
def search_titles(request):
    query = request.query_params.get("query", "")
    media_type = request.query_params.get("media_type", "all")
    genre = request.query_params.get("genre")
    year = request.query_params.get("year")

    if media_type not in {"all", "movie", "tv"}:
        return Response({"detail": "Invalid media_type."}, status=400)

    try:
        results = _search_payload(query, media_type, genre, year)
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)

    return Response({"results": results})


@api_view(["GET"])
def title_details(request, media_type, tmdb_id):
    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)

    try:
        return Response(_details_payload(media_type, tmdb_id))
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET", "POST"])
def title_reviews(request, media_type, tmdb_id):
    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)

    if request.method == "GET":
        reviews = Review.objects.filter(media_type=media_type, tmdb_id=tmdb_id)
        return Response({"reviews": [_serialize_review(review) for review in reviews]})

    author_name = str(request.data.get("author_name", "")).strip()
    title_snapshot = str(request.data.get("title_snapshot", "")).strip()
    content = str(request.data.get("content", "")).strip()
    rating = request.data.get("rating")

    if not author_name or not title_snapshot or not content:
        return Response({"detail": "Author, title, and review content are required."}, status=400)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({"detail": "Rating must be an integer."}, status=400)

    if rating < 1 or rating > 10:
        return Response({"detail": "Rating must be between 1 and 10."}, status=400)

    review = Review.objects.create(
        media_type=media_type,
        tmdb_id=tmdb_id,
        title_snapshot=title_snapshot,
        author_name=author_name,
        rating=rating,
        content=content,
    )
    return Response(_serialize_review(review), status=201)
