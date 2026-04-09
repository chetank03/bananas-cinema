from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Review


class MoviesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_review_lifecycle(self):
        response = self.client.post(
            "/api/reviews/movie/550/",
            {
                "author_name": "Casey",
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
