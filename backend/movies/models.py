from django.db import models


class Review(models.Model):
    MOVIE = "movie"
    TV = "tv"
    MEDIA_TYPE_CHOICES = [
        (MOVIE, "Movie"),
        (TV, "TV Show"),
    ]

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
