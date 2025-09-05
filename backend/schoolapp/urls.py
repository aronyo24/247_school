from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    TeamList,
    TrackVisitorView,
    get_random_questions,
    render_quiz_pdf,
    GenerateQuizAPIView,
    UploadImageAPIView,
)

urlpatterns = [
    path("api/teams/", TeamList.as_view(), name="team-list"),
    path("api/track-visitor/", TrackVisitorView.as_view(), name="track-visitor"),
    path("api/random-questions/", get_random_questions, name="random-questions"),
    path("api/render-quiz-pdf/", render_quiz_pdf, name="render_quiz_pdf"),
    path("api/generate-quiz/", GenerateQuizAPIView.as_view(), name="generate_quiz"),
    path("api/upload-image/", UploadImageAPIView.as_view(), name="upload_image"),
]

# ✅ Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)