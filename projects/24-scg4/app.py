from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for, Response,
)
from flask_cors import CORS
import io, os, time, json, threading, uuid, logging, re
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler
from werkzeug.security import check_password_hash, generate_password_hash
from config import config
from scripts.utils import (
    db, Transaccion, LoteCarga, CargaJob, Usuario, Ente, ReporteGenerado,
    ENTES_CATALOG, ENTES_BY_CODIGO,
    process_files_to_database, seed_entes_from_catalog, validate_txt_file_balance,
)
from sqlalchemy import func


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    log_dir = Path("log")
    log_dir.mkdir(exist_ok=True)
    handler = RotatingFileHandler("log/app.log", maxBytes=10 * 1024 * 1024, backupCount=5)
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s"))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    db.init_app(app)
    CORS(app)

    with app.app_context():
        try:
            db.create_all()
            app.logger.info("Base de datos lista")

            def _seed_default_user():
                target_username = "luis"
                user = Usuario.query.filter(func.lower(Usuario.username) == target_username).first()
                if not user:
                    user = Usuario.query.filter_by(username="admin").first()
                if not user:
                    user = Usuario(username=target_username)
                else:
                    user.username = target_username
                user.nombre_completo = "Luis"
                user.password_hash = generate_password_hash("luis2025")
                user.rol = "admin"
                user.activo = True
                db.session.add(user)
                db.session.commit()

            _seed_default_user()
            seed_entes_from_catalog()

            changed = False
            for ente in Ente.query.all():
                expected_clave = f"SCG4-{str(ente.codigo or '').strip()}"
                if expected_clave and ente.clave != expected_clave:
                    ente.clave = expected_clave
                    changed = True
            if changed:
                db.session.commit()
        except Exception as e:
            app.logger.error(f"Error init DB: {e}")
            raise

    def _get_active_user(username):
        normalized = (username or "").strip().lower()
        if not normalized:
            return None
        return Usuario.query.filter(
            func.lower(Usuario.username) == normalized,
            Usuario.activo.is_(True),
        ).first()

    def _is_authenticated():
        return _get_active_user(session.get("auth_user")) is not None

    @app.before_request
    def require_login():
        if request.method == "OPTIONS":
            return None
        if request.endpoint in {"login", "logout", "static"}:
            return None
        if request.path.startswith("/static/") or request.endpoint is None:
            return None
        if session.get("auth_user") and not _is_authenticated():
            session.clear()
        if _is_authenticated():
            return None
        if request.path.startswith("/api/"):
            return jsonify({"error": "Sesión requerida"}), 401
        next_url = request.full_path.rstrip("?")
        return redirect(url_for("login", next=next_url))

    jobs = {}
    jobs_lock = threading.Lock()
    stats_cache = {"data": None, "ts": 0}
    stats_cache_lock = threading.Lock()

    def _invalidate_stats_cache():
        with stats_cache_lock:
            stats_cache["ts"] = 0
            stats_cache["data"] = None

    def _update_job(job_id, **kwargs):
        with jobs_lock:
            job = jobs.setdefault(job_id, {
                "progress": 0, "message": "Iniciando...", "done": False,
                "error": None, "current_file": None, "lote_id": None, "total_registros": 0,
            })
            for k, v in kwargs.items():
                if k in job:
                    job[k] = v
        try:
            row = CargaJob.query.filter_by(job_id=job_id).first()
            if not row:
                row = CargaJob(job_id=job_id)
            for k, v in kwargs.items():
                if hasattr(row, k):
                    setattr(row, k, v)
            row.updated_at = datetime.utcnow()
            db.session.add(row)
            db.session.commit()
        except Exception:
            db.session.rollback()

    def _get_job(job_id):
        row = CargaJob.query.filter_by(job_id=job_id).first()
        if row:
            d = row.to_dict()
            with jobs_lock:
                jobs[job_id] = {k: d.get(k) for k in
                    ("progress", "message", "done", "error", "current_file", "lote_id", "total_registros")}
            return d
        with jobs_lock:
            return dict(jobs.get(job_id, {}))

    def _get_example_input_dir():
        candidates = [
            Path(app.root_path) / "example_SCG4" / "input",
            Path(app.root_path) / "example" / "input",
            Path(app.root_path) / "example",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_dir():
                return candidate
        return candidates[0]

    def _get_catalogo_general_selection_payload():
        visible_by_codigo = {
            str(ente.codigo or "").strip(): ente
            for ente in Ente.query.filter_by(activo=True).all()
        }
        items = []
        for order, raw in enumerate(ENTES_CATALOG, start=1):
            codigo = str(raw.get("codigo", "") or "").strip()
            nombre = str(raw.get("nombre", "") or "").strip()
            siglas = str(raw.get("siglas", "") or "").strip()
            ambito = str(raw.get("ambito", "ESTATAL") or "ESTATAL").strip().upper()
            grupo = "entes" if ambito == "ESTATAL" else "municipios"
            resolved = visible_by_codigo.get(codigo)
            label_parts = [part for part in (codigo, siglas, nombre) if part]
            items.append({
                "id": f"{grupo}:{codigo}",
                "num": codigo,
                "nombre": nombre,
                "siglas": siglas,
                "clasificacion": str(raw.get("tipo", "") or "").strip(),
                "ambito": ambito,
                "grupo": grupo,
                "grupo_label": "Entes estatales" if grupo == "entes" else "Municipios y paramunicipales",
                "orden": order,
                "ente_clave": str(getattr(resolved, "clave", "") or "").strip(),
                "dd": str(
                    getattr(resolved, "dd_match", "") or getattr(resolved, "dd", "") or ""
                ).strip(),
                "label": " · ".join(label_parts),
            })
        return {
            "opciones": items,
            "total": len(items),
            "stats": {
                "entes": sum(1 for item in items if item["grupo"] == "entes"),
                "municipios": sum(1 for item in items if item["grupo"] == "municipios"),
            },
        }

    FILTER_FIELDS = {
        "cuenta_contable": {"column": Transaccion.cuenta_contable, "match": "prefix"},
        "ente_nombre":     {"column": Transaccion.ente_nombre,     "match": "contains"},
        "ente_codigo":     {"column": Transaccion.ente_codigo,     "match": "exact"},
        "seg1":            {"column": Transaccion.seg1,            "match": "exact"},
        "poliza":          {"column": Transaccion.poliza,          "match": "contains"},
        "beneficiario":    {"column": Transaccion.beneficiario,    "match": "contains"},
        "descripcion":     {"column": Transaccion.descripcion,     "match": "contains"},
        "fecha_inicio":    {"column": Transaccion.fecha_transaccion, "kind": "range", "op": "gte"},
        "fecha_fin":       {"column": Transaccion.fecha_transaccion, "kind": "range", "op": "lte"},
    }

    def _apply_filters(query, filters):
        for key, value in (filters or {}).items():
            cfg = FILTER_FIELDS.get(key)
            if not cfg or not value:
                continue
            col = cfg["column"]
            if cfg.get("kind") == "range":
                try:
                    dt = datetime.strptime(value, "%Y-%m-%d").date()
                except (ValueError, TypeError):
                    continue
                query = query.filter(col >= dt if cfg["op"] == "gte" else col <= dt)
            else:
                match = cfg.get("match", "contains")
                if match == "exact":
                    query = query.filter(col == value)
                elif match == "prefix":
                    query = query.filter(col.like(f"{value}%"))
                else:
                    query = query.filter(col.like(f"%{value}%"))
        return query

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/reporte-online")
    def reporte_online():
        return render_template("reporte_online.html")

    @app.route("/catalogo-entes")
    def catalogo_entes():
        return render_template("catalogo_entes.html")

    @app.route("/reporte-resumen")
    def reporte_resumen():
        return render_template("reporte_resumen.html")

    @app.route("/dashboard")
    def dashboard():
        return render_template("dashboard.html")

    @app.route("/reportes")
    def reportes():
        return render_template("reportes.html")

    @app.route("/catalogo")
    def catalogo():
        return render_template("catalogo.html")

    @app.route("/catalogo-fuentes")
    def catalogo_fuentes():
        return render_template("catalogo_fuentes.html")

    @app.route("/auditor")
    def auditor():
        return render_template("auditor_dashboard.html")

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if _is_authenticated():
            return redirect(url_for("index"))

        error = None
        next_url = request.values.get("next", "").strip()
        if not next_url.startswith("/") or next_url.startswith("//"):
            next_url = ""

        usuarios_activos = sorted(
            Usuario.query.filter(Usuario.activo.is_(True)).all(),
            key=lambda u: (u.nombre_completo or u.username or "").lower(),
        )
        selected_username = ""
        selected_display = "usuario"

        if request.method == "POST":
            selected_username = request.form.get("username", "").strip().lower()
            for u in usuarios_activos:
                if (u.username or "").strip().lower() == selected_username:
                    selected_display = u.nombre_completo or u.username
                    break
            password = request.form.get("password", "")
            user = _get_active_user(selected_username)
            if not usuarios_activos:
                error = "No hay usuarios activos configurados."
            elif not user or not user.password_hash or not check_password_hash(user.password_hash, password):
                error = "Usuario o contraseña incorrectos."
            else:
                session.clear()
                session.permanent = True
                session["auth_user"] = user.username
                return redirect(next_url or url_for("index"))

        return render_template(
            "login.html",
            error=error,
            next_url=next_url,
            usuarios_activos=usuarios_activos,
            selected_username=selected_username,
            selected_display=selected_display,
        )

    @app.get("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "SCG4"})

    @app.get("/api/entes")
    def api_entes():
        entes = [e.to_dict() for e in Ente.query.filter_by(activo=True).order_by(Ente.nombre).all()]
        return jsonify({"entes": entes, "total": len(entes)})

    @app.get("/api/catalogo-general")
    def api_catalogo_general():
        return jsonify(_get_catalogo_general_selection_payload())

    @app.get("/api/fuentes")
    def api_fuentes():
        return jsonify({"fuentes": [], "total": 0, "message": "Catálogo de fuentes pendiente de implementación"})

    @app.get("/api/entes/lista")
    def api_entes_lista():
        nombres = [
            row[0]
            for row in db.session.query(Transaccion.ente_nombre)
            .filter(Transaccion.ente_nombre.isnot(None))
            .filter(func.length(func.trim(Transaccion.ente_nombre)) > 0)
            .distinct()
            .order_by(Transaccion.ente_nombre.asc())
            .all()
        ]
        return jsonify({"entes": nombres})

    def _get_loaded_filenames():
        loaded = set()
        for (archivos,) in db.session.query(LoteCarga.archivos).all():
            if archivos:
                for a in archivos:
                    if a:
                        loaded.add(Path(a).name)
        for (ao,) in db.session.query(Transaccion.archivo_origen).distinct().all():
            if ao:
                loaded.add(Path(ao).name)
        return loaded

    @app.post("/api/process")
    def api_process():
        try:
            files = request.files.getlist("archivo")
            usuario = request.form.get("usuario", session.get("auth_user", "sistema"))
            allow_duplicates = request.form.get("allow_duplicates", "false").lower() in ("1", "true", "yes")
            periodo_ano_str = request.form.get("periodo_ano", "").strip()
            periodo_ano = int(periodo_ano_str) if periodo_ano_str.isdigit() else datetime.now().year

            if not files or all(f.filename == "" for f in files):
                return jsonify({"error": "No se subieron archivos"}), 400

            valid_files = []
            for f in files:
                if f.filename:
                    filename = Path(f.filename).name
                    ext = os.path.splitext(filename)[1].lower()
                    if ext != ".txt":
                        return jsonify({"error": f"Extensión inválida: {filename}. Solo se aceptan .TXT"}), 400
                    m = re.search(r"_(\d+)\.txt$", filename, re.IGNORECASE)
                    if not m:
                        return jsonify({"error": f"Nombre inválido: {filename}. Formato: R1-L1-M12_101.TXT"}), 400
                    if m.group(1) not in ENTES_BY_CODIGO:
                        return jsonify({"error": f"Código de ente {m.group(1)} no está en el catálogo"}), 400
                    f.seek(0)
                    content_bytes = f.read()
                    validate_txt_file_balance(
                        (filename, io.BytesIO(content_bytes)),
                        periodo_ano=periodo_ano,
                    )
                    valid_files.append({
                        "filename": filename,
                        "content_bytes": content_bytes,
                        "ente_codigo": m.group(1),
                    })

            if not valid_files:
                return jsonify({"error": "No hay archivos válidos"}), 400

            loaded = _get_loaded_filenames()
            files_to_process = []
            duplicates = []
            for f in valid_files:
                if f["filename"] in loaded:
                    duplicates.append(f["filename"])
                else:
                    files_to_process.append(f)

            if duplicates and not files_to_process and not allow_duplicates:
                return jsonify({"error": "Estos archivos ya fueron procesados.", "duplicate_files": duplicates}), 409
            if allow_duplicates:
                files_to_process = valid_files

            entes_detectados = []
            for f in files_to_process:
                info = ENTES_BY_CODIGO.get(f["ente_codigo"], {})
                nombre = info.get("nombre", "")
                if nombre and nombre not in entes_detectados:
                    entes_detectados.append(nombre)

            job_ente_name = entes_detectados[0] if len(entes_detectados) == 1 else "Varios entes"
            job_id = str(uuid.uuid4())

            _update_job(
                job_id,
                usuario=usuario, ente_nombre=job_ente_name,
                archivos=[f["filename"] for f in files_to_process],
                progress=0, message="Iniciando...", done=False,
                error=None, current_file=None, lote_id=None, total_registros=0,
            )

            files_in_memory = []
            for f in files_to_process:
                files_in_memory.append((f["filename"], io.BytesIO(f["content_bytes"])))

            def progress_cb(pct, msg, current_file=None):
                _update_job(job_id, progress=pct, message=msg, current_file=current_file)

            def run_process():
                try:
                    with app.app_context():
                        lote_id, total = process_files_to_database(
                            files_in_memory, usuario, progress_cb, periodo_ano=periodo_ano
                        )
                        label = "Archivo" if len(files_in_memory) == 1 else "Archivos"
                        _update_job(
                            job_id, lote_id=lote_id, total_registros=total,
                            done=True, progress=100,
                            message=f"{label} procesado{'s' if len(files_in_memory)!=1 else ''} con éxito. {total:,} registros agregados.",
                        )
                        _invalidate_stats_cache()
                except Exception as e:
                    _update_job(job_id, error=str(e), done=True)

            threading.Thread(target=run_process, daemon=True).start()
            resp = {"job_id": job_id, "ente": job_ente_name, "entes_detectados": entes_detectados}
            if duplicates:
                resp["duplicate_files"] = duplicates
            return jsonify(resp), 202

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            app.logger.error(f"Error en /api/process: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/progress/<job_id>/")
    @app.get("/api/progress/<job_id>")
    def api_progress(job_id):
        def stream():
            deadline = time.time() + 300
            while time.time() < deadline:
                job = _get_job(job_id)
                data = json.dumps({
                    "progress": job.get("progress", 0),
                    "message": job.get("message", ""),
                    "done": job.get("done", False),
                    "error": job.get("error"),
                    "current_file": job.get("current_file"),
                    "lote_id": job.get("lote_id"),
                    "total_registros": job.get("total_registros", 0),
                })
                yield f"data: {data}\n\n"
                if job.get("done") or job.get("error"):
                    break
                time.sleep(0.8)
        return Response(stream(), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.get("/api/progress/<job_id>/status")
    def api_progress_status(job_id):
        job = _get_job(job_id)
        if not job:
            return jsonify({"error": "Job no encontrado"}), 404
        return jsonify({
            "progress": job.get("progress", 0),
            "message": job.get("message", ""),
            "done": job.get("done", False),
            "error": job.get("error"),
            "current_file": job.get("current_file"),
            "lote_id": job.get("lote_id"),
            "total_registros": job.get("total_registros", 0),
        })

    @app.get("/api/transacciones")
    def api_transacciones():
        try:
            page = max(1, int(request.args.get("page", 1)))
            per_page = min(int(request.args.get("per_page", 50)), app.config["MAX_ITEMS_PER_PAGE"])
            filters = {key: request.args.get(key, "").strip() for key in FILTER_FIELDS
                       if request.args.get(key, "").strip()}
            query = _apply_filters(Transaccion.query, filters)
            query = query.order_by(Transaccion.fecha_transaccion.desc(), Transaccion.id.desc())
            total = query.count()
            pages = max(1, -(-total // per_page))
            items = query.offset((page - 1) * per_page).limit(per_page).all()
            return jsonify({
                "transacciones": [t.to_dict() for t in items],
                "total": total, "page": page, "pages": pages, "per_page": per_page,
            })
        except Exception as e:
            app.logger.error(f"Error en /api/transacciones: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/transacciones/resumen")
    def api_transacciones_resumen():
        try:
            totals = db.session.query(
                func.count(Transaccion.id),
                func.coalesce(func.sum(Transaccion.cargos), 0),
                func.coalesce(func.sum(Transaccion.abonos), 0),
            ).first()
            if not totals:
                totals = (0, 0, 0)
            total_registros = int(totals[0] or 0)
            total_cargos = float(totals[1] or 0)
            total_abonos = float(totals[2] or 0)
            diferencia = total_cargos - total_abonos
            coincide = abs(diferencia) < 0.005
            return jsonify({
                "total_registros": total_registros,
                "total_cargos": total_cargos,
                "total_abonos": total_abonos,
                "diferencia": diferencia,
                "coincide": coincide,
            })
        except Exception as e:
            app.logger.error(f"Error en /api/transacciones/resumen: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/dashboard/stats")
    def api_dashboard_stats():
        now = time.time()
        with stats_cache_lock:
            if stats_cache["data"] and (now - stats_cache["ts"]) < 60:
                return jsonify(stats_cache["data"])
        try:
            total_transacciones = db.session.query(func.count(Transaccion.id)).scalar() or 0
            total_cuentas = db.session.query(func.count(Transaccion.cuenta_contable.distinct())).scalar() or 0
            suma_cargos = float(db.session.query(func.sum(Transaccion.cargos)).scalar() or 0)
            suma_abonos = float(db.session.query(func.sum(Transaccion.abonos)).scalar() or 0)
            meses_raw = (
                db.session.query(
                    func.strftime("%Y-%m", Transaccion.fecha_transaccion).label("mes"),
                    func.count(Transaccion.id).label("total"),
                ).group_by("mes").order_by("mes").all()
            )
            top_entes_raw = (
                db.session.query(Transaccion.ente_nombre, func.count(Transaccion.id).label("total"))
                .filter(Transaccion.ente_nombre.isnot(None))
                .filter(func.length(func.trim(Transaccion.ente_nombre)) > 0)
                .group_by(Transaccion.ente_nombre)
                .order_by(func.count(Transaccion.id).desc())
                .limit(10).all()
            )
            data = {
                "total_transacciones": total_transacciones,
                "total_cuentas": total_cuentas,
                "suma_cargos": suma_cargos,
                "suma_abonos": suma_abonos,
                "transacciones_mes": [{"mes": m, "total": t} for m, t in meses_raw],
                "top_entes": [{"ente": e, "total": t} for e, t in top_entes_raw],
            }
            with stats_cache_lock:
                stats_cache["data"] = data
                stats_cache["ts"] = now
            return jsonify(data)
        except Exception as e:
            app.logger.error(f"Error en /api/dashboard/stats: {e}")
            return jsonify({"error": str(e)}), 500

    @app.get("/api/example-files")
    def api_example_files():
        example_dir = _get_example_input_dir()
        files = []
        if example_dir.exists():
            for ext in ("*.TXT", "*.txt"):
                files.extend(f.name for f in sorted(example_dir.glob(ext)))
        loaded = _get_loaded_filenames()
        return jsonify({"files": [{"name": f, "loaded": f in loaded} for f in files]})

    @app.get("/api/archivos-procesados")
    def api_archivos_procesados():
        try:
            lotes = LoteCarga.query.order_by(LoteCarga.fecha_carga.desc()).all()
            archivos = []
            archivos_map = {}
            for lote in lotes:
                if lote.archivos:
                    for a in lote.archivos:
                        nombre = Path(a).name if a else ""
                        if not nombre or nombre in archivos_map:
                            continue
                        payload = {
                            "archivo": nombre,
                            "tipo_archivo": "auxiliar",
                            "fecha_carga": lote.fecha_carga.isoformat() if lote.fecha_carga else None,
                            "lote_id": lote.lote_id,
                        }
                        archivos_map[nombre] = payload
                        archivos.append(payload)

            for (archivo_origen,) in (
                db.session.query(Transaccion.archivo_origen)
                .distinct()
                .order_by(Transaccion.archivo_origen.asc())
                .all()
            ):
                if not archivo_origen:
                    continue
                nombre = Path(archivo_origen).name
                if nombre in archivos_map:
                    continue
                archivos.append({
                    "archivo": nombre,
                    "tipo_archivo": "auxiliar",
                    "fecha_carga": None,
                    "lote_id": None,
                })
            return jsonify({"archivos": archivos})
        except Exception as e:
            app.logger.error(f"Error en /api/archivos-procesados: {e}")
            return jsonify({"archivos": []})

    @app.post("/api/process-example")
    def api_process_example():
        try:
            body = request.json or {}
            filenames = body.get("files", [])
            usuario = session.get("auth_user", "sistema")
            periodo_ano = int(str(body.get("periodo_ano", datetime.now().year)))
            if not filenames:
                return jsonify({"error": "No se especificaron archivos"}), 400
            example_dir = _get_example_input_dir()
            files_in_memory = []
            for fname in filenames:
                path = example_dir / fname
                if path.exists():
                    with open(path, "rb") as fh:
                        content_bytes = fh.read()
                        validate_txt_file_balance(
                            (fname, io.BytesIO(content_bytes)),
                            periodo_ano=periodo_ano,
                        )
                        files_in_memory.append((fname, io.BytesIO(content_bytes)))
            if not files_in_memory:
                return jsonify({"error": "No se encontraron los archivos"}), 404
            job_id = str(uuid.uuid4())
            _update_job(job_id, archivos=[f[0] for f in files_in_memory],
                        progress=0, message="Iniciando...", done=False,
                        error=None, current_file=None, lote_id=None, total_registros=0)

            def progress_cb(pct, msg, current_file=None):
                _update_job(job_id, progress=pct, message=msg, current_file=current_file)

            def run_process():
                try:
                    with app.app_context():
                        lote_id, total = process_files_to_database(
                            files_in_memory, usuario, progress_cb, periodo_ano=periodo_ano)
                        _update_job(job_id, lote_id=lote_id, total_registros=total,
                                    done=True, progress=100,
                                    message=f"Completado. {total:,} registros agregados.")
                        _invalidate_stats_cache()
                except Exception as e:
                    _update_job(job_id, error=str(e), done=True)

            threading.Thread(target=run_process, daemon=True).start()
            return jsonify({"job_id": job_id}), 202
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app
