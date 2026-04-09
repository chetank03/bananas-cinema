from django.conf import settings
from django.db import models


class Review(models.Model):
    MOVIE = "movie"
    TV = "tv"
    MEDIA_TYPE_CHOICES = [
        (MOVIE, "Movie"),
        (TV, "TV Show"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reviews",
    )
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    tmdb_id = models.PositiveIntegerField()
    title_snapshot = models.CharField(max_length=255)
    author_name = models.CharField(max_length=80)
    rating = models.PositiveSmallIntegerField()
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["media_type", "tmdb_id"]),
        ]

    def __str__(self):
        return f"{self.title_snapshot} by {self.author_name}"


class Favorite(models.Model):
    MOVIE = "movie"
    TV = "tv"
    MEDIA_TYPE_CHOICES = [
        (MOVIE, "Movie"),
        (TV, "TV Show"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    tmdb_id = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    poster_url = models.URLField(blank=True, default="")
    overview = models.TextField(blank=True, default="")
    year = models.CharField(max_length=4, blank=True, default="")
    rating = models.FloatField(default=0)
    personal_rating = models.FloatField(null=True, blank=True)
    watch_later = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "media_type", "tmdb_id"], name="unique_user_favorite"),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.media_type}:{self.tmdb_id}"


class Watchlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlists")
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_user_watchlist_name"),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.name}"


class WatchlistItem(models.Model):
    MOVIE = "movie"
    TV = "tv"
    MEDIA_TYPE_CHOICES = [
        (MOVIE, "Movie"),
        (TV, "TV Show"),
    ]

    watchlist = models.ForeignKey(Watchlist, on_delete=models.CASCADE, related_name="items")
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    tmdb_id = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    poster_url = models.URLField(blank=True, default="")
    overview = models.TextField(blank=True, default="")
    year = models.CharField(max_length=4, blank=True, default="")
    rating = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["watchlist", "media_type", "tmdb_id"], name="unique_watchlist_item"),
        ]

    def __str__(self):
        return f"{self.watchlist_id}:{self.media_type}:{self.tmdb_id}"
