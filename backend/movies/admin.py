from django.contrib import admin

from .models import Favorite, Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("title_snapshot", "media_type", "tmdb_id", "author_name", "rating", "created_at")
    search_fields = ("title_snapshot", "author_name", "content")
    list_filter = ("media_type", "rating", "created_at")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "media_type", "tmdb_id", "created_at")
    search_fields = ("title", "user__username")
    list_filter = ("media_type", "created_at")
