from django.urls import path

from .views import (
    auth_login,
    auth_logout,
    auth_me,
    auth_signup,
    favorites_collection,
    favorites_delete,
    genres,
    health,
    home,
    search_titles,
    title_details,
    title_reviews,
    watchlist_detail,
    watchlist_item_delete,
    watchlist_items_collection,
    watchlists_collection,
)


urlpatterns = [
    path("health/", health),
    path("auth/signup/", auth_signup),
    path("auth/login/", auth_login),
    path("auth/logout/", auth_logout),
    path("auth/me/", auth_me),
    path("home/", home),
    path("genres/", genres),
    path("search/", search_titles),
    path("titles/<str:media_type>/<int:tmdb_id>/", title_details),
    path("reviews/<str:media_type>/<int:tmdb_id>/", title_reviews),
    path("favorites/", favorites_collection),
    path("favorites/<int:favorite_id>/", favorites_delete),
    path("watchlists/", watchlists_collection),
    path("watchlists/<int:watchlist_id>/", watchlist_detail),
    path("watchlists/<int:watchlist_id>/items/", watchlist_items_collection),
    path("watchlists/<int:watchlist_id>/items/<int:item_id>/", watchlist_item_delete),
]
