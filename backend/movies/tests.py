from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Favorite, Review, Watchlist, WatchlistItem


class MoviesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_review_lifecycle(self):
        user = User.objects.create_user(username="casey", email="casey@example.com", password="secret123")
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        response = self.client.post(
            "/api/reviews/movie/550/",
            {
                "title_snapshot": "Fight Club",
                "rating": 9,
                "content": "Sharp and rewatchable.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Review.objects.count(), 1)

        list_response = self.client.get("/api/reviews/movie/550/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()["reviews"]), 1)
        self.assertEqual(list_response.json()["reviews"][0]["author_name"], "casey")

    @patch("movies.views._search_payload")
    def test_search_endpoint(self, mock_search_payload):
        mock_search_payload.return_value = [
            {
                "id": 1,
                "media_type": "movie",
                "title": "Arrival",
                "overview": "",
                "poster_url": "",
                "backdrop_url": "",
                "release_date": "2016-11-11",
                "year": "2016",
                "rating": 7.9,
                "vote_count": 100,
                "genre_ids": [18],
            }
        ]

        response = self.client.get("/api/search/?query=arrival&media_type=movie")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["title"], "Arrival")

    @patch("movies.views._tmdb_get")
    def test_search_filters_work_without_query(self, mock_tmdb_get):
        mock_tmdb_get.return_value = {
            "results": [
                {
                    "id": 11,
                    "title": "Filtered Movie",
                    "overview": "",
                    "poster_path": "/poster.jpg",
                    "backdrop_path": "/backdrop.jpg",
                    "release_date": "2024-05-01",
                    "vote_average": 7.4,
                    "vote_count": 10,
                    "genre_ids": [18],
                    "popularity": 99,
                }
            ]
        }

        response = self.client.get("/api/search/?media_type=movie&genre=18&year=2024")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
        self.assertEqual(response.json()["results"][0]["title"], "Filtered Movie")
        mock_tmdb_get.assert_called_once_with(
            "/discover/movie",
            {"include_adult": "false", "sort_by": "popularity.desc", "with_genres": "18", "primary_release_year": "2024"},
        )

    @patch("movies.views._tmdb_get")
    def test_search_media_type_only_uses_discover(self, mock_tmdb_get):
        mock_tmdb_get.return_value = {
            "results": [
                {
                    "id": 22,
                    "name": "Filtered Show",
                    "overview": "",
                    "poster_path": "/poster.jpg",
                    "backdrop_path": "/backdrop.jpg",
                    "first_air_date": "2023-09-01",
                    "vote_average": 7.4,
                    "vote_count": 10,
                    "genre_ids": [18],
                    "popularity": 99,
                }
            ]
        }

        response = self.client.get("/api/search/?media_type=tv")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
        self.assertEqual(response.json()["results"][0]["title"], "Filtered Show")
        mock_tmdb_get.assert_called_once_with(
            "/discover/tv",
            {"include_adult": "false", "sort_by": "popularity.desc"},
        )

    @patch("movies.views._tmdb_get")
    def test_tv_title_details_handles_empty_episode_runtime(self, mock_tmdb_get):
        mock_tmdb_get.return_value = {
            "id": 1416,
            "name": "Grey's Anatomy",
            "overview": "Hospital drama.",
            "poster_path": "/poster.jpg",
            "backdrop_path": "/backdrop.jpg",
            "first_air_date": "2005-03-27",
            "vote_average": 8.2,
            "vote_count": 100,
            "episode_run_time": [],
            "genres": [{"id": 18, "name": "Drama"}],
            "credits": {"cast": [], "crew": []},
            "videos": {"results": []},
            "similar": {"results": []},
        }

        response = self.client.get("/api/titles/tv/1416/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Grey's Anatomy")
        self.assertIsNone(response.json()["runtime"])

    def test_auth_signup_login_and_favorites(self):
        signup_response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "bananafan",
                "email": "bananafan@example.com",
                "password": "secret123",
            },
            format="json",
        )
        self.assertEqual(signup_response.status_code, 201)
        token = signup_response.json()["token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        favorite_response = self.client.post(
            "/api/favorites/",
            {
                "tmdb_id": 550,
                "media_type": "movie",
                "title": "Fight Club",
                "poster_url": "",
                "overview": "Test overview",
                "year": "1999",
                "rating": 8.5,
                "personal_rating": 4.5,
                "watch_later": True,
            },
            format="json",
        )
        self.assertIn(favorite_response.status_code, [200, 201])
        self.assertEqual(Favorite.objects.count(), 1)
        self.assertEqual(Favorite.objects.first().personal_rating, 4.5)
        self.assertTrue(Favorite.objects.first().watch_later)

        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertTrue(me_response.json()["authenticated"])

        list_response = self.client.get("/api/favorites/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()["favorites"]), 1)
        self.assertEqual(list_response.json()["favorites"][0]["personal_rating"], 4.5)
        self.assertTrue(list_response.json()["favorites"][0]["watch_later"])

    def test_watchlist_crud_and_item_management(self):
        user = User.objects.create_user(username="watcher", email="watcher@example.com", password="secret123")
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        create_response = self.client.post("/api/watchlists/", {"name": "Weekend Queue"}, format="json")
        self.assertEqual(create_response.status_code, 201)
        watchlist_id = create_response.json()["id"]
        self.assertEqual(Watchlist.objects.count(), 1)

        add_item_response = self.client.post(
            f"/api/watchlists/{watchlist_id}/items/",
            {
                "tmdb_id": 550,
                "media_type": "movie",
                "title": "Fight Club",
                "poster_url": "",
                "overview": "Test overview",
                "year": "1999",
                "rating": 8.5,
            },
            format="json",
        )
        self.assertIn(add_item_response.status_code, [200, 201])
        self.assertEqual(WatchlistItem.objects.count(), 1)
        self.assertEqual(add_item_response.json()["item_count"], 1)

        rename_response = self.client.patch(f"/api/watchlists/{watchlist_id}/", {"name": "Friday Night"}, format="json")
        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(rename_response.json()["name"], "Friday Night")

        list_response = self.client.get("/api/watchlists/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()["watchlists"]), 1)
        self.assertEqual(list_response.json()["watchlists"][0]["items"][0]["title"], "Fight Club")

        watchlist_item_id = list_response.json()["watchlists"][0]["items"][0]["id"]
        remove_item_response = self.client.delete(f"/api/watchlists/{watchlist_id}/items/{watchlist_item_id}/")
        self.assertEqual(remove_item_response.status_code, 204)
        self.assertEqual(WatchlistItem.objects.count(), 0)

        delete_watchlist_response = self.client.delete(f"/api/watchlists/{watchlist_id}/")
        self.assertEqual(delete_watchlist_response.status_code, 204)
        self.assertEqual(Watchlist.objects.count(), 0)
