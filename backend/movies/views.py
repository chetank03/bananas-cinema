from collections import OrderedDict

import requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Favorite, Review, Watchlist, WatchlistItem


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
    year = str(year).strip() if year else ""

    genre_id = None
    if genre:
        try:
            genre_id = int(genre)
        except (TypeError, ValueError):
            raise TMDbError("Genre filter must be numeric.")

    has_non_default_filter = media_type in {"movie", "tv"} or bool(genre_id) or bool(year)
    if not query and not has_non_default_filter:
        return []

    if query:
        if media_type == "movie":
            data = _tmdb_get("/search/movie", {"query": query, "include_adult": "false"})
            items = data.get("results", [])
        elif media_type == "tv":
            data = _tmdb_get("/search/tv", {"query": query, "include_adult": "false"})
            items = data.get("results", [])
        else:
            data = _tmdb_get("/search/multi", {"query": query, "include_adult": "false"})
            items = data.get("results", [])
    else:
        discover_params = {"include_adult": "false", "sort_by": "popularity.desc"}
        if genre_id:
            discover_params["with_genres"] = str(genre_id)

        if media_type == "movie":
            if year:
                discover_params["primary_release_year"] = year
            items = _tmdb_get("/discover/movie", discover_params).get("results", [])
        elif media_type == "tv":
            if year:
                discover_params["first_air_date_year"] = year
            items = _tmdb_get("/discover/tv", discover_params).get("results", [])
        else:
            movie_params = discover_params.copy()
            tv_params = discover_params.copy()
            if year:
                movie_params["primary_release_year"] = year
                tv_params["first_air_date_year"] = year
            movie_items = _tmdb_get("/discover/movie", movie_params).get("results", [])
            tv_items = _tmdb_get("/discover/tv", tv_params).get("results", [])
            items = sorted(
                [
                    *[{**item, "media_type": "movie"} for item in movie_items],
                    *[{**item, "media_type": "tv"} for item in tv_items],
                ],
                key=lambda item: item.get("popularity") or 0,
                reverse=True,
            )

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
    episode_run_time = data.get("episode_run_time") or []
    runtime = data.get("runtime") or (episode_run_time[0] if episode_run_time else None)

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
        "runtime": runtime,
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


def _serialize_favorite(favorite):
    return {
        "id": favorite.id,
        "tmdb_id": favorite.tmdb_id,
        "media_type": favorite.media_type,
        "title": favorite.title,
        "poster_url": favorite.poster_url,
        "overview": favorite.overview,
        "year": favorite.year,
        "rating": favorite.rating,
        "personal_rating": favorite.personal_rating,
        "watch_later": favorite.watch_later,
    }


def _serialize_watchlist_item(item):
    return {
        "id": item.id,
        "tmdb_id": item.tmdb_id,
        "media_type": item.media_type,
        "title": item.title,
        "poster_url": item.poster_url,
        "overview": item.overview,
        "year": item.year,
        "rating": item.rating,
    }


def _serialize_watchlist(watchlist):
    items = list(watchlist.items.all())
    return {
        "id": watchlist.id,
        "name": watchlist.name,
        "item_count": len(items),
        "items": [_serialize_watchlist_item(item) for item in items],
    }


def _serialize_user(user, token=None):
    payload = {
        "authenticated": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }
    if token is not None:
        payload["token"] = token.key
    return payload


def _require_string(value, field_name):
    value = str(value or "").strip()
    if not value:
        raise ValueError(f"{field_name} is required.")
    return value


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if value in (None, ""):
        return False
    if isinstance(value, (int, float)):
        return bool(value)

    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y", "on"}:
        return True
    if normalized in {"false", "0", "no", "n", "off"}:
        return False
    raise ValueError("Boolean value expected.")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_signup(request):
    try:
        username = _require_string(request.data.get("username"), "Username")
        email = _require_string(request.data.get("email"), "Email")
        password = _require_string(request.data.get("password"), "Password")
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "Email already exists."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    token = Token.objects.create(user=user)
    return Response(_serialize_user(user, token), status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    username = str(request.data.get("username", "")).strip()
    password = str(request.data.get("password", "")).strip()
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=400)

    token, _ = Token.objects.get_or_create(user=user)
    return Response(_serialize_user(user, token))


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    if request.auth:
        request.auth.delete()
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def auth_me(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"authenticated": False})
    return Response(_serialize_user(request.user))


@api_view(["GET"])
@permission_classes([AllowAny])
def home(request):
    try:
        return Response(_build_home_payload())
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET"])
@permission_classes([AllowAny])
def genres(request):
    try:
        return Response({"genres": _combined_genres()})
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET"])
@permission_classes([AllowAny])
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
@permission_classes([AllowAny])
def title_details(request, media_type, tmdb_id):
    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)

    try:
        return Response(_details_payload(media_type, tmdb_id))
    except TMDbError as exc:
        return Response({"detail": str(exc)}, status=503)


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def title_reviews(request, media_type, tmdb_id):
    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)

    if request.method == "GET":
        reviews = Review.objects.filter(media_type=media_type, tmdb_id=tmdb_id)
        return Response({"reviews": [_serialize_review(review) for review in reviews]})

    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Sign in to post a review."}, status=401)

    title_snapshot = str(request.data.get("title_snapshot", "")).strip()
    content = str(request.data.get("content", "")).strip()
    rating = request.data.get("rating")

    if not title_snapshot or not content:
        return Response({"detail": "Title and review content are required."}, status=400)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({"detail": "Rating must be an integer."}, status=400)

    if rating < 1 or rating > 10:
        return Response({"detail": "Rating must be between 1 and 10."}, status=400)

    review = Review.objects.create(
        user=request.user,
        media_type=media_type,
        tmdb_id=tmdb_id,
        title_snapshot=title_snapshot,
        author_name=request.user.username,
        rating=rating,
        content=content,
    )
    return Response(_serialize_review(review), status=201)


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def favorites_collection(request):
    if request.method == "GET":
        favorites = Favorite.objects.filter(user=request.user)
        return Response({"favorites": [_serialize_favorite(favorite) for favorite in favorites]})

    media_type = str(request.data.get("media_type", "")).strip()
    title = str(request.data.get("title", "")).strip()
    poster_url = str(request.data.get("poster_url", "")).strip()
    overview = str(request.data.get("overview", "")).strip()
    year = str(request.data.get("year", "")).strip()
    rating = request.data.get("rating", 0)
    personal_rating = request.data.get("personal_rating")
    watch_later = request.data.get("watch_later", False)
    tmdb_id = request.data.get("tmdb_id")

    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)
    if not title:
        return Response({"detail": "Title is required."}, status=400)

    try:
        tmdb_id = int(tmdb_id)
    except (TypeError, ValueError):
        return Response({"detail": "TMDb id must be an integer."}, status=400)

    try:
        rating = float(rating or 0)
    except (TypeError, ValueError):
        rating = 0

    try:
        watch_later = _coerce_bool(watch_later)
    except ValueError:
        return Response({"detail": "Watch later must be true or false."}, status=400)

    if personal_rating in ("", None):
        personal_rating = None
    else:
        try:
            personal_rating = float(personal_rating)
        except (TypeError, ValueError):
            return Response({"detail": "Personal rating must be a number."}, status=400)

        if personal_rating < 0.5 or personal_rating > 5:
            return Response({"detail": "Personal rating must be between 0.5 and 5."}, status=400)
        if (personal_rating * 2) % 1 != 0:
            return Response({"detail": "Personal rating must use 0.5 steps."}, status=400)

    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        media_type=media_type,
        tmdb_id=tmdb_id,
        defaults={
            "title": title,
            "poster_url": poster_url,
            "overview": overview,
            "year": year,
            "rating": rating,
            "personal_rating": personal_rating,
            "watch_later": watch_later,
        },
    )

    if not created:
        favorite.title = title
        favorite.poster_url = poster_url
        favorite.overview = overview
        favorite.year = year
        favorite.rating = rating
        favorite.personal_rating = personal_rating
        favorite.watch_later = watch_later
        favorite.save(update_fields=["title", "poster_url", "overview", "year", "rating", "personal_rating", "watch_later"])

    return Response(_serialize_favorite(favorite), status=201 if created else 200)


@api_view(["DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def favorites_delete(request, favorite_id):
    deleted, _ = Favorite.objects.filter(id=favorite_id, user=request.user).delete()
    if not deleted:
        return Response({"detail": "Favorite not found."}, status=404)
    return Response(status=204)


@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def watchlists_collection(request):
    if request.method == "GET":
        watchlists = Watchlist.objects.filter(user=request.user).prefetch_related("items")
        return Response({"watchlists": [_serialize_watchlist(watchlist) for watchlist in watchlists]})

    try:
        name = _require_string(request.data.get("name"), "Watchlist name")
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    if len(name) > 80:
        return Response({"detail": "Watchlist name must be 80 characters or fewer."}, status=400)
    if Watchlist.objects.filter(user=request.user, name__iexact=name).exists():
        return Response({"detail": "A watchlist with that name already exists."}, status=400)

    watchlist = Watchlist.objects.create(user=request.user, name=name)
    watchlist = Watchlist.objects.filter(id=watchlist.id).prefetch_related("items").get()
    return Response(_serialize_watchlist(watchlist), status=201)


@api_view(["PATCH", "DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def watchlist_detail(request, watchlist_id):
    try:
        watchlist = Watchlist.objects.prefetch_related("items").get(id=watchlist_id, user=request.user)
    except Watchlist.DoesNotExist:
        return Response({"detail": "Watchlist not found."}, status=404)

    if request.method == "DELETE":
        watchlist.delete()
        return Response(status=204)

    try:
        name = _require_string(request.data.get("name"), "Watchlist name")
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    if len(name) > 80:
        return Response({"detail": "Watchlist name must be 80 characters or fewer."}, status=400)
    if Watchlist.objects.filter(user=request.user, name__iexact=name).exclude(id=watchlist.id).exists():
        return Response({"detail": "A watchlist with that name already exists."}, status=400)

    watchlist.name = name
    watchlist.save(update_fields=["name", "updated_at"])
    watchlist = Watchlist.objects.prefetch_related("items").get(id=watchlist.id)
    return Response(_serialize_watchlist(watchlist))


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def watchlist_items_collection(request, watchlist_id):
    try:
        watchlist = Watchlist.objects.prefetch_related("items").get(id=watchlist_id, user=request.user)
    except Watchlist.DoesNotExist:
        return Response({"detail": "Watchlist not found."}, status=404)

    media_type = str(request.data.get("media_type", "")).strip()
    title = str(request.data.get("title", "")).strip()
    poster_url = str(request.data.get("poster_url", "")).strip()
    overview = str(request.data.get("overview", "")).strip()
    year = str(request.data.get("year", "")).strip()
    rating = request.data.get("rating", 0)
    tmdb_id = request.data.get("tmdb_id")

    if media_type not in {"movie", "tv"}:
        return Response({"detail": "Invalid media type."}, status=400)
    if not title:
        return Response({"detail": "Title is required."}, status=400)

    try:
        tmdb_id = int(tmdb_id)
    except (TypeError, ValueError):
        return Response({"detail": "TMDb id must be an integer."}, status=400)

    try:
        rating = float(rating or 0)
    except (TypeError, ValueError):
        rating = 0

    item, created = WatchlistItem.objects.get_or_create(
        watchlist=watchlist,
        media_type=media_type,
        tmdb_id=tmdb_id,
        defaults={
            "title": title,
            "poster_url": poster_url,
            "overview": overview,
            "year": year,
            "rating": rating,
        },
    )

    if not created:
        item.title = title
        item.poster_url = poster_url
        item.overview = overview
        item.year = year
        item.rating = rating
        item.save(update_fields=["title", "poster_url", "overview", "year", "rating"])

    watchlist = Watchlist.objects.filter(id=watchlist.id).prefetch_related("items").get()
    return Response(_serialize_watchlist(watchlist), status=201 if created else 200)


@api_view(["DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def watchlist_item_delete(request, watchlist_id, item_id):
    deleted, _ = WatchlistItem.objects.filter(id=item_id, watchlist_id=watchlist_id, watchlist__user=request.user).delete()
    if not deleted:
        return Response({"detail": "Watchlist item not found."}, status=404)
    return Response(status=204)
