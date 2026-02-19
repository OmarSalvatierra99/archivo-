# app.py
from __future__ import annotations
import os
import time
import re
import configparser
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from logging.handlers import RotatingFileHandler
from flask import (
    Flask, render_template, jsonify, send_file, send_from_directory, abort, request
)
from werkzeug.utils import secure_filename
from markdown import markdown

# ---------------------------------------------------------
# App setup
# ---------------------------------------------------------
app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
PROJECTS_DIR = BASE_DIR / "projects"
LIVE_URLS = {
    "01-cleandoc": "https://cleandoc.omar-xyz.shop",
    "02-pasanotas": "https://pasanotas.omar-xyz.shop",
    "03-auditel": "https://auditel.omar-xyz.shop",
    "04-lexnum": "https://lexnum.omar-xyz.shop",
    "05-sasp": "https://sasp.omar-xyz.shop",
    "06-sasp-php": "https://sasp-php.omar-xyz.shop",
    "07-sifet-estatales": "https://sifet-estatales.omar-xyz.shop",
    "08-siif": "https://siif.omar-xyz.shop",
    "09-xml-php": "https://xml-php.omar-xyz.shop",
    "10-vehiculos": "https://vehiculos.omar-xyz.shop",
    "11-impostor": "https://impostor.omar-xyz.shop",
    "12-scan-actas-nacimiento": "https://actas.omar-xyz.shop",
    "13-triples": "https://triples.omar-xyz.shop",
    "14-sakurabarbershop": "https://sakurabarber.omar-xyz.shop",
    "15-trabajadores": "https://trabajadores.omar-xyz.shop",
    "16-neotatto": "https://neotatto.omar-xyz.shop",
    "17-shm-php": "https://sociedadherpetologicamexicana.omar-xyz.shop",
    "18-orale-un-cafe": "https://oraleuncafe.omar-xyz.shop",
    "19-archivo": "https://archivo.omar-xyz.shop",
}

# ---------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------
LOG_DIR = BASE_DIR / "log"
LOG_DIR.mkdir(exist_ok=True)
log_handler = RotatingFileHandler(
    LOG_DIR / "portfolio.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5
)
log_handler.setFormatter(logging.Formatter(
    '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
))
app.logger.addHandler(log_handler)
app.logger.setLevel(logging.INFO)
app.logger.info("Portfolio application started")

# ---------------------------------------------------------
# Cache for project metadata
# ---------------------------------------------------------
_CACHE_TTL_SEC = 30
_projects_cache: Dict[str, List[Dict[str, Any]]] = {}
_projects_cache_sig: Dict[str, str] = {}
_projects_cache_time: Dict[str, float] = {}


def _projects_signature() -> str:
    """Generate a hash signature to detect file modifications in project directories."""
    parts: List[str] = []
    for folder in sorted(p for p in PROJECTS_DIR.iterdir() if p.is_dir()):
        if folder.name in {".git", "venv", "static", "templates", "__pycache__"}:
            continue
        if folder.name.startswith("."):
            continue
        mtimes: List[str] = []
        for rel in ("README.md", "README_ES.md", "README_EN.md", ".git/config"):
            p = folder / rel
            if p.exists():
                try:
                    mtimes.append(str(p.stat().st_mtime_ns))
                except Exception:
                    mtimes.append("0")
        parts.append(f"{folder.name}:{'|'.join(mtimes)}")
    return "|".join(parts)


# ---------------------------------------------------------
# Project parsing logic
# ---------------------------------------------------------
def _parse_readme(path: Path) -> Dict[str, str]:
    """Parse README for title, description, live URL, and rendered HTML."""
    text = path.read_text(encoding="utf-8")
    html = markdown(text)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    data = {
        "name": "",
        "description": "",
        "live_url": "",
        "full_description": html,
        "readme_preview": "",
        "test_hint": "",
    }

    # Extract title from first markdown heading
    for line in lines:
        if line.startswith("#"):
            data["name"] = line.lstrip("#").strip()
            break

    # Extract first paragraph as description
    for line in lines:
        if line.startswith(("#", "🔗", "**")):
            continue
        if len(line.split()) > 3:
            data["description"] = markdown(line)
            break

    # Build a short README preview (up to 2 paragraphs)
    preview_chunks: List[str] = []
    for line in lines:
        if line.startswith(("#", "🔗", "**")):
            continue
        if len(line.split()) > 3:
            preview_chunks.append(line)
        if len(preview_chunks) >= 2:
            break
    if preview_chunks:
        data["readme_preview"] = markdown("\n\n".join(preview_chunks))

    # Detect live URL pattern: 🔗 **Live:** [text](url) or 🔗 **En vivo:** url
    m = re.search(
        r"🔗\s*\*\*(?:Live|En\\s*vivo)\s*:\*\*\\s*(?:\\[[^\\]]*\\]\\(([^)]+)\\)|([^\\s]+))",
        text,
        re.IGNORECASE,
    )
    if m:
        data["live_url"] = (m.group(1) or m.group(2) or "").strip()

    # Detect a friendly testing hint from README
    test_patterns = [
        r"python\s+-m\s+pytest[^\n]*",
        r"pytest[^\n]*",
        r"python\s+-m\s+unittest[^\n]*",
        r"npm\s+test[^\n]*",
        r"composer\s+test[^\n]*",
        r"phpunit[^\n]*",
    ]
    for pattern in test_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            data["test_hint"] = m.group(0).strip()
            break

    return data


def _readme_candidates(lang: str) -> List[str]:
    if lang == "en":
        return ["README_EN.md", "README.md", "README_ES.md"]
    return ["README_ES.md", "README.md", "README_EN.md"]


def load_projects(lang: str) -> List[Dict[str, Any]]:
    """Load and cache all projects from ~/portfolio/projects."""
    global _projects_cache, _projects_cache_sig, _projects_cache_time
    now = time.time()
    sig = _projects_signature()
    cached = _projects_cache.get(lang)
    if (
        cached
        and _projects_cache_sig.get(lang) == sig
        and now - _projects_cache_time.get(lang, 0.0) < _CACHE_TTL_SEC
    ):
        return cached

    projects: List[Dict[str, Any]] = []
    for folder in sorted(p for p in PROJECTS_DIR.iterdir() if p.is_dir()):
        try:
            if folder.name in {".git", "venv", "static", "templates", "__pycache__"}:
                continue
            if folder.name.startswith("."):
                continue

            readme_path = None
            for candidate in _readme_candidates(lang):
                candidate_path = folder / candidate
                if candidate_path.exists():
                    readme_path = candidate_path
                    break
            git_config = folder / ".git" / "config"

            if readme_path is None and not git_config.exists():
                continue

            meta = _parse_readme(readme_path) if readme_path else {}
            name = meta.get("name") or folder.name.replace("-", " ").title()
            description = meta.get("description") or markdown("No description available.")
            live_url = meta.get("live_url") or LIVE_URLS.get(folder.name, "")
            full_description = meta.get("full_description", "")
            readme_preview = meta.get("readme_preview", "") or description
            test_hint = meta.get("test_hint", "")

            # Extract GitHub repo URL from .git/config
            repo_url = ""
            if git_config.exists():
                try:
                    cfg = configparser.ConfigParser()
                    cfg.read(git_config, encoding="utf-8")
                    raw = cfg.get('remote "origin"', "url", fallback="")
                    if raw:
                        if raw.startswith("git@github.com:"):
                            repo_url = raw.replace("git@github.com:", "https://github.com/").removesuffix(".git")
                        elif raw.startswith("https://github.com/"):
                            repo_url = raw.removesuffix(".git")
                except Exception:
                    pass

            projects.append(
                {
                    "name": name,
                    "slug": folder.name,
                    "description": description,
                    "full_description": full_description,
                    "readme_preview": readme_preview,
                    "repo_url": repo_url,
                    "live_url": live_url,
                    "template_url": "",
                    "test_hint": test_hint,
                }
            )

        except Exception as e:
            print(f"[WARN] Skipped {folder.name}: {e}")
            continue

    _projects_cache[lang] = projects
    _projects_cache_sig[lang] = sig
    _projects_cache_time[lang] = now
    return projects


# ---------------------------------------------------------
# Portfolio Data (Profile + Resume)
# ---------------------------------------------------------
portfolio_data: Dict[str, Any] = {
    "name": "Omar Gabriel Salvatierra García",
    "title": "Python Backend Developer | Linux Specialist",
    "headline": "Servicios de desarrollo backend, automatización y despliegue confiable.",
    "about": (
        "Desarrollador backend con enfoque en Python, Linux y automatización. "
        "Construyo sistemas claros, mantenibles y listos para producción."
    ),
    "photo_url": "/static/img/profile.jpg",
    "socials": {
        "GitHub": "https://github.com/OmarSalvatierra99",
        "LinkedIn": "https://www.linkedin.com/in/omarsalvatierra",
        "Email": "mailto:omargabrielsalvatierragarcia@gmail.com",
    },
    "technical_skills": [
        "Python",
        "Flask / FastAPI",
        "Linux Administration",
        "Docker / Kubernetes",
        "CI/CD (GitHub Actions)",
    ],
    "experience": [
        {
            "title": "Python Developer — OFS (Audit and Fiscal Oversight)",
            "period": "Sep 2024 – Present",
            "description": (
                "Developed automation pipelines in Python for public account processing, "
                "reducing errors and processing time. Designed scalable XML validation tools "
                "and integrated AI-assisted models to improve audit workflows."
            ),
        },
        {
            "title": "Backend Developer — Tornillera Central S.A. de C.V.",
            "period": "Apr 2023 – Sep 2024",
            "description": (
                "Built a complete sales and inventory management system with role-based access, "
                "QR scanning, and REST APIs using Django and React."
            ),
        },
        {
            "title": "Python Developer — Comercializadora Plugar S.A. de C.V.",
            "period": "Jan 2018 – May 2022",
            "description": (
                "Developed automation and reporting tools integrating data workflows "
                "with Excel and Python for business clients."
            ),
        },
    ],
    "education": [
        "Master’s in Government Auditing — Iexe School of Public Policy (2024 – Present)",
        "B.Sc. in Business Management — Instituto Tecnológico de Apizaco (2018 – 2023)",
        "Data Science — Instituto Politécnico Nacional (2022 – 2023, Incomplete)",
        "Graphic Design — Cecyteh Metropolitano del Valle de México (2014 – 2017)",
    ],
    "languages": [
        "Spanish — Native",
        "English — Advanced",
        "French — Intermediate",
    ],
    "resume": {"url": "/resume"},
}

# ---------------------------------------------------------
# Simple i18n content (Spanish-first landing + English mirror)
# ---------------------------------------------------------
I18N: Dict[str, Dict[str, Any]] = {
    "es": {
        "html_lang": "es",
        "site_title_suffix": "Servicios de Desarrollo",
        "nav_home": "Inicio",
        "nav_projects": "Proyectos",
        "nav_resume": "CV",
        "nav_services": "Servicios",
        "switch_label": "English",
        "hero_badge": "Servicios Backend & Automatización",
        "hero_intro": "Hola, soy",
        "hero_subtitle": "Desarrollo soluciones que resuelven problemas reales.",
        "hero_slogan": "Diseño con intención",
        "hero_description": (
            "Te ayudo a diseñar, construir y desplegar software con enfoque en claridad, "
            "velocidad y estabilidad."
        ),
        "typing_texts": [
            "Backend en Python",
            "Automatización de procesos",
            "APIs claras y mantenibles",
            "Despliegue en Linux",
        ],
        "cta_primary": "Ver proyectos",
        "cta_secondary": "Hablemos",
        "services_title": "Servicios",
        "services_subtitle": "Lo que puedo construir contigo",
        "services": [
            {
                "icon": "fa-solid fa-server",
                "title": "Backend & APIs",
                "text": "APIs rápidas, limpias y con buena estructura desde el día uno.",
            },
            {
                "icon": "fa-solid fa-gears",
                "title": "Automatización",
                "text": "Menos trabajo manual, más resultados repetibles y confiables.",
            },
            {
                "icon": "fa-solid fa-rocket",
                "title": "Despliegue",
                "text": "Servicios en Linux con systemd, NGINX y flujos simples de operar.",
            },
        ],
        "featured_title": "Proyectos destacados",
        "featured_view_all": "Ver todos",
        "projects_empty": "Aún no hay proyectos disponibles.",
        "projects_page_title": "Proyectos",
        "projects_page_subtitle": (
            "Ejemplos reales de soluciones backend, automatización y despliegue."
        ),
        "projects_test_label": "Pruebas rápidas",
        "projects_test_help": "Ejecuta pruebas con este comando:",
        "projects_test_fallback": "Revisa el README para el flujo de pruebas recomendado.",
        "projects_back_home": "Volver al inicio",
        "details": "Detalles",
        "code": "Código",
        "demo": "Visitar sitio",
        "local_demo": "Demo local",
        "deploy_section_title": "Archivos de despliegue",
        "deploy_section_hint": (
            "Estos archivos muestran cómo se publica el proyecto (systemd / NGINX)."
        ),
        "breadcrumb_home": "Inicio",
        "breadcrumb_projects": "Proyectos",
        "back_to_projects": "Volver a proyectos",
        "report_issue": "Reportar issue",
        "experience_title": "Experiencia",
        "skills_title": "Fortalezas técnicas",
        "education_title": "Educación",
        "languages_title": "Idiomas",
        "contact_title": "¿Listo para construir algo útil?",
        "contact_primary": "Enviar correo",
        "contact_secondary": "LinkedIn",
        "footer_built_with": "Hecho con Python & Flask",
    },
    "en": {
        "html_lang": "en",
        "site_title_suffix": "Development Services",
        "nav_home": "Home",
        "nav_projects": "Projects",
        "nav_resume": "Resume",
        "nav_services": "Services",
        "switch_label": "Español",
        "hero_badge": "Backend & Automation Services",
        "hero_intro": "Hi, I'm",
        "hero_subtitle": "I build solutions that solve real problems.",
        "hero_slogan": "Design with intention",
        "hero_description": (
            "I help you design, build, and ship software with clarity, speed, and stability."
        ),
        "typing_texts": [
            "Python backends",
            "Process automation",
            "Clear, maintainable APIs",
            "Linux deployments",
        ],
        "cta_primary": "View projects",
        "cta_secondary": "Let's talk",
        "services_title": "Services",
        "services_subtitle": "What I can build with you",
        "services": [
            {
                "icon": "fa-solid fa-server",
                "title": "Backend & APIs",
                "text": "Fast, clean APIs with solid structure from day one.",
            },
            {
                "icon": "fa-solid fa-gears",
                "title": "Automation",
                "text": "Less manual work, more repeatable and reliable outcomes.",
            },
            {
                "icon": "fa-solid fa-rocket",
                "title": "Deployment",
                "text": "Linux services with systemd, NGINX, and simple operations.",
            },
        ],
        "featured_title": "Featured projects",
        "featured_view_all": "View all",
        "projects_empty": "No projects available yet.",
        "projects_page_title": "Projects",
        "projects_page_subtitle": (
            "Real examples of backend solutions, automation, and deployment."
        ),
        "projects_test_label": "Quick tests",
        "projects_test_help": "Run tests with this command:",
        "projects_test_fallback": "Check the README for the recommended testing flow.",
        "projects_back_home": "Back to home",
        "details": "Details",
        "code": "Code",
        "demo": "Visit site",
        "local_demo": "Local demo",
        "deploy_section_title": "Deployment files",
        "deploy_section_hint": (
            "These files show how the project is published (systemd / NGINX)."
        ),
        "breadcrumb_home": "Home",
        "breadcrumb_projects": "Projects",
        "back_to_projects": "Back to projects",
        "report_issue": "Report issue",
        "experience_title": "Experience",
        "skills_title": "Technical strengths",
        "education_title": "Education",
        "languages_title": "Languages",
        "contact_title": "Ready to build something useful?",
        "contact_primary": "Send email",
        "contact_secondary": "LinkedIn",
        "footer_built_with": "Built with Python & Flask",
    },
}


def _detect_lang_from_path(path: str) -> str:
    return "en" if path.startswith("/en") else "es"


def _lang_prefix(lang: str) -> str:
    return "/en" if lang == "en" else ""


def _swap_lang(path: str) -> str:
    if path.startswith("/en"):
        swapped = path.removeprefix("/en") or "/"
        return swapped
    return f"/en{path if path.startswith('/') else '/' + path}"

# ---------------------------------------------------------
# Template context + security headers
# ---------------------------------------------------------
@app.context_processor
def inject_globals():
    path = request.path or "/"
    lang = _detect_lang_from_path(path)
    i18n = I18N[lang]
    prefix = _lang_prefix(lang)

    return {
        "year": datetime.utcnow().year,
        "data": portfolio_data,
        "lang": lang,
        "i18n": i18n,
        "home_url": f"{prefix}/" if prefix else "/",
        "projects_url": f"{prefix}/projects" if prefix else "/projects",
        "alt_lang_url": _swap_lang(path),
        "alt_lang_label": i18n["switch_label"],
    }


@app.after_request
def add_security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return resp


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------
def _render_index():
    lang = _detect_lang_from_path(request.path or "/")
    return render_template("index.html", projects=load_projects(lang))


def _render_projects():
    lang = _detect_lang_from_path(request.path or "/")
    return render_template("projects.html", projects=load_projects(lang))


def _render_project_detail(slug: str):
    lang = _detect_lang_from_path(request.path or "/")
    project = next((p for p in load_projects(lang) if p["slug"] == slug), None)
    if not project:
        abort(404)
    return render_template("project_detail.html", project=project)


@app.route("/")
def index():
    return _render_index()


@app.route("/en")
@app.route("/en/")
def index_en():
    return _render_index()


@app.route("/projects")
def projects():
    return _render_projects()


@app.route("/en/projects")
def projects_en():
    return _render_projects()


@app.route("/projects/<slug>")
def project_detail(slug: str):
    return _render_project_detail(slug)


@app.route("/en/projects/<slug>")
def project_detail_en(slug: str):
    return _render_project_detail(slug)


@app.route("/projects/<slug>/<path:asset>")
def serve_project_asset(slug: str, asset: str):
    folder = PROJECTS_DIR / slug
    path = folder / asset
    if not (folder.is_dir() and path.exists()):
        abort(404)
    return send_from_directory(folder, asset)


@app.route("/en/projects/<slug>/<path:asset>")
def serve_project_asset_en(slug: str, asset: str):
    return serve_project_asset(slug, asset)


# ---------------------------------------------------------
# Resume handling
# ---------------------------------------------------------
CV_DIR = BASE_DIR / "static" / "cv"
CV_DIR.mkdir(parents=True, exist_ok=True)
CV_FILENAME = "resume.pdf"
RESUME_UPLOAD_TOKEN = os.environ.get("RESUME_UPLOAD_TOKEN")
ALLOWED_EXTENSIONS = {"pdf"}


def _cv_path() -> Path:
    return CV_DIR / CV_FILENAME


@app.get("/resume")
def resume_download():
    path = _cv_path()
    if not path.exists():
        return jsonify({"status": "missing", "message": "Resume not uploaded yet."}), 404
    return send_file(path, as_attachment=False, download_name=CV_FILENAME, mimetype="application/pdf")


@app.post("/resume/upload")
def resume_upload():
    token = request.headers.get("X-RESUME-TOKEN") or request.args.get("token")
    if not RESUME_UPLOAD_TOKEN or token != RESUME_UPLOAD_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401
    if "file" not in request.files:
        return jsonify({"error": "File part missing"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Only PDF is allowed"}), 400

    tmp_name = f"._tmp_{int(datetime.utcnow().timestamp())}.pdf"
    tmp_path = CV_DIR / secure_filename(tmp_name)
    file.save(tmp_path)
    tmp_path.replace(_cv_path())
    dest = _cv_path()
    return jsonify({
        "status": "ok",
        "public_url": "/resume",
        "size_bytes": dest.stat().st_size,
        "updated_at": datetime.utcfromtimestamp(dest.stat().st_mtime).isoformat() + "Z",
    }), 201


# ---------------------------------------------------------
# Entry point
# ---------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
