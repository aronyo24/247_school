from django.utils.timezone import now
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from team.models import TeamMember
from visitors_details.models import Visitor
from .serializers import TeamMemberSerializer
from ipware import get_client_ip
from django.http import JsonResponse
from mathquiz.models import Question
import json
import random
from django.template.loader import render_to_string
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
import io
import zipfile
import os
from django.utils.decorators import method_decorator
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# Try WeasyPrint, but don't fail import if native libs missing
try:
    from weasyprint import HTML
except Exception:
    HTML = None

class TeamList(ListAPIView):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer


class TrackVisitorView(APIView):
    def post(self, request):
        ip, _ = get_client_ip(request)
        if ip is None:
            return Response({"error": "Could not determine IP address"}, status=status.HTTP_400_BAD_REQUEST)

        user_agent = request.META.get("HTTP_USER_AGENT", "Unknown")
        private_ip = request.data.get("private_ip", "Unknown")

        visitor, created = Visitor.objects.get_or_create(ip_address=ip)
        visitor.user_agent = user_agent
        visitor.private_ip = private_ip
        visitor.last_visit = now()
        visitor.visit_count += 1

        # Optional: Try to get location info (only if geoip2 DB is available)
        try:
            import geocoder
            g = geocoder.ip(ip)
            visitor.city = g.city or "Unknown"
            visitor.country = g.country or "Unknown"
        except Exception as e:
            print("GeoIP lookup failed:", e)
            visitor.city = "Unknown"
            visitor.country = "Unknown"

        visitor.save()

        return Response({"message": "Visitor tracked successfully"}, status=status.HTTP_200_OK)



def get_random_questions(request):
    questions = list(Question.objects.all())
    random.shuffle(questions)
    selected = questions[:5]  # pick 5 random
    return JsonResponse([q.to_dict() for q in selected], safe=False)

@csrf_exempt
def render_quiz_pdf(request):
    """
    POST /api/render-quiz-pdf/
    Expects JSON: { "title": "...", "questions": [ { id, imageUrl, count, images? }, ... ] }
    Returns: application/pdf (or 500 with error message)
    """
    if request.method != "POST":
        return HttpResponse(status=405)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    title = payload.get("title", "Counting Quiz")
    questions = payload.get("questions", [])

    # Ensure each question has images list for template
    for q in questions:
        try:
            q_count = int(q.get("count", 1))
        except Exception:
            q_count = 1
        if not q.get("images"):
            url = q.get("imageUrl", "")
            # if relative path was provided, make absolute using SITE_URL (or MEDIA) if needed
            if url and url.startswith("/"):
                # use request.build_absolute_uri to convert to absolute
                url = request.build_absolute_uri(url)
            q["images"] = [url] * max(1, q_count)

    html = render_to_string("schoolapp/quiz_pdf.html", {"title": title, "questions": questions})
    base_url = getattr(settings, "MEDIA_ROOT", None) or getattr(settings, "BASE_DIR", None)

    # Produce PDF bytes
    pdf_bytes = None
    if HTML is not None:
        try:
            pdf_bytes = HTML(string=html, base_url=base_url).write_pdf()
        except Exception as e:
            return HttpResponse(f"WeasyPrint error: {e}", status=500)
    else:
        # fallback to pdfkit/wkhtmltopdf (install wkhtmltopdf separately)
        try:
            import pdfkit
            # if wkhtmltopdf is not on PATH, configure path: pdfkit.configuration(wkhtmltopdf=r"C:\path\to\wkhtmltopdf.exe")
            pdf_bytes = pdfkit.from_string(html, False)
        except Exception as e:
            return HttpResponse(f"No PDF backend available: {e}", status=500)

    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = 'attachment; filename="quiz.pdf"'
    return resp

@method_decorator(csrf_exempt, name="dispatch")
class GenerateQuizAPIView(APIView):
    """
    GET /api/generate-quiz/?n_variants=3&questions=6
    Builds simple quiz variants from Question model, returns single PDF or ZIP of PDFs.
    """
    def get(self, request):
        try:
            n_variants = max(1, int(request.GET.get("n_variants", 1)))
            n_questions = max(1, int(request.GET.get("questions", 6)))
        except ValueError:
            return JsonResponse({"error": "Invalid parameters"}, status=400)

        pdf_buffers = []
        all_questions = list(Question.objects.all())
        if not all_questions:
            return JsonResponse({"error": "No questions available"}, status=404)

        for _ in range(n_variants):
            random.shuffle(all_questions)
            sel = all_questions[:n_questions]
            payload_questions = []
            for i, q in enumerate(sel, start=1):
                # build simple payload for template
                image_url = getattr(q, "image_url", None) or getattr(q, "image", None)
                if hasattr(image_url, "url"):
                    image_url = image_url.url
                payload_questions.append({
                    "id": i,
                    "name": getattr(q, "title", str(q)),
                    "imageUrl": image_url or "",
                    "count": random.randint(2, 6),
                })

            html = render_to_string("schoolapp/quiz_pdf.html", {"title": "Counting Quiz", "questions": payload_questions})
            base_url = getattr(settings, "MEDIA_ROOT", None) or getattr(settings, "BASE_DIR", None)

            if HTML is not None:
                try:
                    pdf = HTML(string=html, base_url=base_url).write_pdf()
                except Exception as e:
                    return HttpResponse(f"WeasyPrint error: {e}", status=500)
            else:
                try:
                    import pdfkit
                    pdf = pdfkit.from_string(html, False)
                except Exception as e:
                    return HttpResponse(f"PDF backend not available: {e}", status=500)

            pdf_buffers.append(pdf)

        if n_variants == 1:
            resp = HttpResponse(pdf_buffers[0], content_type="application/pdf")
            resp["Content-Disposition"] = 'attachment; filename="quiz.pdf"'
            return resp

        zip_io = io.BytesIO()
        with zipfile.ZipFile(zip_io, "w") as zf:
            for idx, p in enumerate(pdf_buffers, start=1):
                zf.writestr(f"quiz_variant_{idx}.pdf", p)
        zip_io.seek(0)
        resp = HttpResponse(zip_io.read(), content_type="application/zip")
        resp["Content-Disposition"] = 'attachment; filename="quizzes.zip"'
        return resp

@method_decorator(csrf_exempt, name="dispatch")
class UploadImageAPIView(APIView):
    """
    POST /api/upload-image/  (multipart: images[], category optional)
    Saves files to MEDIA_ROOT/uploads/ and returns their URLs.
    """
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        files = request.FILES.getlist("images") or []
        created = []
        upload_dir = "uploads"
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        for f in files:
            save_path = os.path.join(upload_dir, f.name)
            saved_name = default_storage.save(save_path, ContentFile(f.read()))
            file_url = os.path.join(media_url.rstrip("/"), saved_name).replace("\\", "/")
            created.append({"name": f.name, "url": file_url})
        return JsonResponse({"created": created}, status=201)

