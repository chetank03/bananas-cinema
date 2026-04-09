from django.urls import path

from .views import genres, health, home, search_titles, title_details, title_reviews


urlpatterns = [
    path("health/", health),
    path("home/", home),
    path("genres/", genres),
    path("search/", search_titles),
    path("titles/<str:media_type>/<int:tmdb_id>/", title_details),
    path("reviews/<str:media_type>/<int:tmdb_id>/", title_reviews),
]
