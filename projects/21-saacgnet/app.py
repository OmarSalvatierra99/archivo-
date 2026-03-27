from flask import Flask, render_template, request, jsonify, Response, send_file, session, redirect, url_for
from flask_cors import CORS
import io, os, time, json, threading, uuid, logging, re
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler
from werkzeug.security import check_password_hash, generate_password_hash
from config import config
from scripts.utils import db, Transaccion, LoteCarga, Usuario, ReporteGenerado, Ente, CargaJob
from scripts.utils import process_files_to_database, validate_excel_file_balance
from scripts.utils import (
    _build_entes_lookup,
    _extract_ente_header,
    _normalize_system_dd_prefix,
    _resolve_ente_catalogo,
    _split_cuenta_contable_segmented,
)
from sqlalchemy import func, and_, or_, inspect, text, cast
from sqlalchemy.exc import IntegrityError
import pandas as pd

def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    def _get_active_user(username):
        normalized = (username or "").strip().lower()
        if not normalized:
            return None
        return (
            Usuario.query
            .filter(
                func.lower(Usuario.username) == normalized,
                Usuario.activo.is_(True)
            )
            .first()
        )

    def _is_authenticated():
        return _get_active_user(session.get("auth_user")) is not None

    def _get_session_user():
        return _get_active_user(session.get("auth_user"))

    def _safe_next_url(raw_url):
        url = (raw_url or "").strip()
        if not url.startswith("/") or url.startswith("//"):
            return ""
        return url

    @app.context_processor
    def inject_current_user():
        user = _get_session_user()
        return {
            "current_user": user,
            "current_user_display_name": (user.nombre_completo or user.username or "").strip() if user else "",
        }

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

    # ==================== CATÁLOGO GENERAL ====================

    def _normalize_text(value):
        s = str(value or "").strip().lower()
        rep = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n"}
        for k, v in rep.items():
            s = s.replace(k, v)
        return re.sub(r"\s+", " ", s)

    def _normalize_dd(value):
        raw = str(value or "").strip().upper()
        raw = re.sub(r"[^0-9A-Z]", "", raw)
        if len(raw) == 1 and raw.isdigit():
            return raw.zfill(2)
        return raw

    def _normalize_catalog_sigla(value):
        return re.sub(r"[^a-z0-9_]", "", _normalize_text(value))

    def _load_catalogo_general():
        try:
            catalog_path = Path(app.root_path) / "catalogos" / "catalogo_general.json"
            if catalog_path.exists():
                return json.loads(catalog_path.read_text(encoding='utf-8'))
        except Exception as exc:
            app.logger.error("[catalogo_general] No se pudo leer el catálogo general: %s", exc)
        return {"entes": [], "municipios": []}

    def _build_ente_lookup():
        by_siglas = {}
        by_nombre = {}
        entes = Ente.query.filter(Ente.activo.is_(True)).all()
        for ente in entes:
            ambito = _normalize_text(ente.ambito)
            siglas = _normalize_text(ente.siglas)
            nombre = _normalize_text(ente.nombre)
            if siglas:
                by_siglas[(ambito, siglas)] = ente
            if nombre:
                by_nombre[(ambito, nombre)] = ente
        return by_siglas, by_nombre

    def _flatten_catalogo_general():
        catalogo_general = _load_catalogo_general()
        by_siglas, by_nombre = _build_ente_lookup()
        items = []
        ordered_groups = [
            ("entes", "ESTATAL", "Entes estatales"),
            ("municipios", "MUNICIPAL", "Municipios y paramunicipales"),
        ]

        order = 0
        for group_key, ambito, group_label in ordered_groups:
            for raw_item in catalogo_general.get(group_key, []):
                order += 1
                siglas = str(raw_item.get("siglas") or "").strip()
                nombre = str(raw_item.get("nombre") or "").strip()
                clasificacion = str(raw_item.get("clasificacion") or "").strip()
                num = str(raw_item.get("num") or "").strip()
                ambito_key = _normalize_text(ambito)
                resolved = None

                if siglas:
                    resolved = by_siglas.get((ambito_key, _normalize_text(siglas)))
                if resolved is None and nombre:
                    resolved = by_nombre.get((ambito_key, _normalize_text(nombre)))

                item = {
                    "id": f"{group_key}:{num}",
                    "num": num,
                    "nombre": nombre,
                    "siglas": siglas,
                    "clasificacion": clasificacion,
                    "ambito": ambito,
                    "grupo": group_key,
                    "grupo_label": group_label,
                    "orden": order,
                    "ente_clave": resolved.clave if resolved else "",
                    "dd": _normalize_dd(
                        resolved.dd if resolved and resolved.dd else (
                            "0A" if ambito == "MUNICIPAL" else ""
                        )
                    ),
                    "dd_match": _normalize_dd(
                        getattr(resolved, "dd_match", "") or ""
                    ) if resolved else "",
                }
                prefix_parts = [part for part in (item["num"], item["siglas"]) if part]
                item["label"] = " · ".join(prefix_parts + [item["nombre"]]) if item["nombre"] else " · ".join(prefix_parts)
                items.append(item)

        return items

    def _filter_catalogo_general_items(username=None):
        return _flatten_catalogo_general()

    def _get_catalogo_general_selection_payload(username=None):
        items = _filter_catalogo_general_items(username=username)
        return {
            "opciones": items,
            "total": len(items),
            "stats": {
                "entes": sum(1 for item in items if item["grupo"] == "entes"),
                "municipios": sum(1 for item in items if item["grupo"] == "municipios"),
            },
        }

    def _find_allowed_catalog_item(raw_value, username=None):
        candidate = str(raw_value or "").strip()
        if not candidate:
            return None
        for item in _filter_catalogo_general_items(username=username):
            if candidate in {item["id"], item["ente_clave"], item["siglas"]}:
                return item
        return None

    # ==================== CATÁLOGO DE CONSULTA ====================

    def _get_catalogo_consulta_payload():
        entes_estatales = (
            Ente.query
            .filter(
                Ente.activo.is_(True),
                func.upper(func.coalesce(Ente.ambito, "")) == "ESTATAL",
            )
            .order_by(Ente.codigo.asc(), Ente.nombre.asc(), Ente.id.asc())
            .all()
        )
        entes_municipales = (
            Ente.query
            .filter(
                Ente.activo.is_(True),
                func.upper(func.coalesce(Ente.ambito, "")) == "MUNICIPAL",
            )
            .order_by(Ente.codigo.asc(), Ente.nombre.asc(), Ente.id.asc())
            .all()
        )

        def _serialize_consulta_ente(ente):
            return {
                "num": str(getattr(ente, "codigo", "") or "").strip(),
                "nombre": str(getattr(ente, "nombre", "") or "").strip(),
                "siglas": str(getattr(ente, "siglas", "") or "").strip(),
                "clasificacion": str(getattr(ente, "tipo", "") or "").strip(),
                "ente_clave": str(getattr(ente, "clave", "") or "").strip(),
                "dd": str(
                    getattr(ente, "dd_match", "") or getattr(ente, "dd", "") or ""
                ).strip(),
            }

        fuentes = []
        try:
            fuentes = _load_fuentes_catalogo_records()
        except Exception:
            pass
        return {
            "entes": {
                "items": [_serialize_consulta_ente(ente) for ente in entes_estatales],
                "total": len(entes_estatales),
            },
            "municipios": {
                "items": [_serialize_consulta_ente(ente) for ente in entes_municipales],
                "total": len(entes_municipales),
            },
            "fuentes": {
                "items": fuentes,
                "total": len(fuentes),
            },
        }

    # Configurar logging
    log_dir = Path('log')
    log_dir.mkdir(exist_ok=True)
    handler = RotatingFileHandler('log/app.log', maxBytes=10*1024*1024, backupCount=10)
    handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    # Inicializar extensiones
    db.init_app(app)
    CORS(app)

    # Crear tablas con manejo de errores
    with app.app_context():
        try:
            db.create_all()
            print("✓ Base de datos conectada")

            def _normalize_nombre(value):
                s = str(value or "").strip().lower()
                rep = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n"}
                for k, v in rep.items():
                    s = s.replace(k, v)
                s = re.sub(r"\s+", " ", s)
                return s

            def _normalize_ente_match(value):
                s = _normalize_nombre(value)
                s = re.sub(r"[^a-z0-9\s]", " ", s)
                s = s.replace("o p d", "organismo publico descentralizado")
                for phrase in (
                    "organismo publico descentralizado",
                    "del estado de tlaxcala",
                    "estado de tlaxcala",
                ):
                    s = s.replace(phrase, " ")
                s = re.sub(r"\ba c\b", " ", s)
                s = re.sub(r"\s+", " ", s).strip()
                return s

            def _header_match_score(header_text, ente):
                detected = _normalize_nombre(header_text)
                if not detected or not ente:
                    return 0

                detected_alias = _normalize_ente_match(header_text)
                candidates = [
                    ente.nombre,
                    ente.siglas,
                    f"{ente.siglas} {ente.nombre}".strip(),
                ]
                best_score = 0

                for candidate in candidates:
                    normalized_candidate = _normalize_nombre(candidate)
                    if normalized_candidate:
                        if detected == normalized_candidate:
                            best_score = max(best_score, 1000 + len(normalized_candidate))
                        elif normalized_candidate in detected:
                            best_score = max(best_score, 900 + len(normalized_candidate))
                        elif detected in normalized_candidate:
                            best_score = max(best_score, 800 + len(detected))

                    normalized_candidate_alias = _normalize_ente_match(candidate)
                    if not detected_alias or not normalized_candidate_alias:
                        continue

                    if detected_alias == normalized_candidate_alias:
                        best_score = max(best_score, 700 + len(normalized_candidate_alias))
                    elif normalized_candidate_alias in detected_alias:
                        best_score = max(best_score, 600 + len(normalized_candidate_alias))
                    elif detected_alias in normalized_candidate_alias:
                        best_score = max(best_score, 500 + len(detected_alias))

                return best_score

            def _resolve_ente_from_header(header_text, entes):
                best_match = None
                best_score = 0
                best_name_length = 0

                for ente in entes or []:
                    score = _header_match_score(header_text, ente)
                    if score <= 0:
                        continue

                    name_length = len(str(getattr(ente, "nombre", "") or "").strip())
                    if score > best_score or (
                        score == best_score and name_length > best_name_length
                    ):
                        best_match = ente
                        best_score = score
                        best_name_length = name_length

                return best_match

            def _ensure_entes_dd_column():
                inspector = inspect(db.engine)
                if "entes" not in inspector.get_table_names():
                    return
                columns = {col["name"] for col in inspector.get_columns("entes")}
                if "dd" in columns:
                    return
                db.session.execute(text("ALTER TABLE entes ADD COLUMN dd VARCHAR(10)"))
                db.session.commit()

            def _ensure_entes_dd_match_column():
                inspector = inspect(db.engine)
                if "entes" not in inspector.get_table_names():
                    return
                columns = {col["name"] for col in inspector.get_columns("entes")}
                if "dd_match" in columns:
                    return
                db.session.execute(text("ALTER TABLE entes ADD COLUMN dd_match VARCHAR(10)"))
                db.session.commit()

            def _ensure_transacciones_schema():
                inspector = inspect(db.engine)
                if "transacciones" not in inspector.get_table_names():
                    return

                columns = {
                    col["name"]: col for col in inspector.get_columns("transacciones")
                }
                required_columns = {
                    "cta": "VARCHAR(20)",
                    "subcta_cog_cri": "VARCHAR(20)",
                    "clv1": "VARCHAR(20)",
                    "clv2": "VARCHAR(20)",
                    "cog": "VARCHAR(20)",
                    "clv3": "VARCHAR(20)",
                    "ente_clave": "VARCHAR(20)",
                    "ente_codigo": "VARCHAR(50)",
                    "ente_dd": "VARCHAR(10)",
                    "ente_nombre": "VARCHAR(255)",
                    "ente_siglas": "VARCHAR(50)",
                    "ente_ambito": "VARCHAR(50)",
                    "no_factura": "VARCHAR(100)",
                    "cheque_folio": "VARCHAR(100)",
                }

                changed = False
                for column_name, column_type in required_columns.items():
                    if column_name in columns:
                        continue
                    db.session.execute(
                        text(
                            f"ALTER TABLE transacciones ADD COLUMN {column_name} {column_type}"
                        )
                    )
                    changed = True

                dialect = db.engine.dialect.name
                cuenta_col = columns.get("cuenta_contable")
                cuenta_length = None
                if cuenta_col is not None:
                    cuenta_length = getattr(cuenta_col["type"], "length", None)
                if dialect == "postgresql" and cuenta_length and cuenta_length < 64:
                    db.session.execute(
                        text(
                            "ALTER TABLE transacciones "
                            "ALTER COLUMN cuenta_contable TYPE VARCHAR(64)"
                        )
                    )
                    changed = True

                if changed:
                    db.session.commit()

            def _backfill_transacciones_entes():
                required_attrs = (
                    "ente_clave",
                    "ente_codigo",
                    "ente_dd",
                    "ente_nombre",
                    "ente_siglas",
                    "ente_ambito",
                    "subcta_cog_cri",
                )
                if not all(hasattr(Transaccion, attr) for attr in required_attrs):
                    return

                entes_lookup = _build_entes_lookup(Ente.query.filter_by(activo=True).all())
                if not entes_lookup:
                    return

                candidates = (
                    Transaccion.query.filter(
                        Transaccion.subcta_cog_cri.isnot(None),
                        func.length(func.trim(Transaccion.subcta_cog_cri)) > 0,
                    )
                    .order_by(Transaccion.id.asc())
                    .all()
                )
                changed = False

                for transaccion in candidates:
                    payload = _resolve_ente_catalogo(
                        getattr(transaccion, "subcta_cog_cri", ""),
                        entes_lookup,
                    )
                    for key, value in payload.items():
                        current = getattr(transaccion, key, None) or ""
                        if current == value:
                            continue
                        setattr(transaccion, key, value)
                        changed = True

                if changed:
                    db.session.commit()

            def _backfill_transacciones_segmentadas():
                required_attrs = (
                    "cta",
                    "subcta_cog_cri",
                    "clv1",
                    "clv2",
                    "cog",
                    "clv3",
                    "cheque_folio",
                )
                if not all(hasattr(Transaccion, attr) for attr in required_attrs):
                    return

                candidates = (
                    Transaccion.query.filter(
                        Transaccion.cuenta_contable.isnot(None),
                        or_(
                            Transaccion.cta.is_(None),
                            Transaccion.cta == "",
                            Transaccion.subcta_cog_cri.is_(None),
                            Transaccion.subcta_cog_cri == "",
                            Transaccion.clv1.is_(None),
                            Transaccion.clv1 == "",
                            Transaccion.clv2.is_(None),
                            Transaccion.cog.is_(None),
                            Transaccion.clv3.is_(None),
                            and_(
                                or_(
                                    Transaccion.cheque_folio.is_(None),
                                    Transaccion.cheque_folio == "",
                                ),
                                Transaccion.orden_pago.isnot(None),
                                func.length(func.trim(Transaccion.orden_pago)) > 0,
                            ),
                        ),
                    )
                    .order_by(Transaccion.id.asc())
                    .all()
                )
                changed = False

                for transaccion in candidates:
                    segmented = _split_cuenta_contable_segmented(
                        transaccion.cuenta_contable
                    )
                    for key, value in segmented.items():
                        current = getattr(transaccion, key, None) or ""
                        if current == value:
                            continue
                        setattr(transaccion, key, value)
                        changed = True

                    current_cheque = (getattr(transaccion, "cheque_folio", None) or "").strip()
                    legacy_order = (transaccion.orden_pago or "").strip()
                    if not current_cheque and legacy_order:
                        transaccion.cheque_folio = legacy_order
                        changed = True

                if changed:
                    db.session.commit()

            def _catalog_value(value):
                if pd.isna(value):
                    return ""
                if isinstance(value, float):
                    if value.is_integer():
                        return str(int(value))
                    return str(value).rstrip("0").rstrip(".")
                return str(value).strip()

            def _catalog_codigo(value):
                return _catalog_value(value).rstrip(".")

            def _seed_entes_catalogo():
                existing_estatales = (
                    Ente.query
                    .filter(
                        Ente.activo.is_(True),
                        func.upper(func.coalesce(Ente.ambito, "")) == "ESTATAL",
                    )
                    .count()
                )
                if existing_estatales > 0:
                    return

                catalog_specs = [
                    ("Estatales.xlsx", "EST", "ESTATAL"),
                ]
                pending_entes = []

                for filename, prefix, ambito in catalog_specs:
                    catalog_path = Path(app.root_path) / "catalogos" / filename
                    if not catalog_path.exists():
                        continue

                    df = pd.read_excel(catalog_path, dtype=object)
                    for row in df.to_dict(orient="records"):
                        codigo = _catalog_codigo(row.get("Clave"))
                        nombre = _catalog_value(row.get("Nombre"))
                        if not codigo or not nombre:
                            continue

                        pending_entes.append({
                            "clave": f"{prefix}-{codigo}",
                            "codigo": codigo,
                            "dd": "0A" if ambito == "MUNICIPAL" else "",
                            "dd_match": "",
                            "nombre": nombre,
                            "siglas": _catalog_value(row.get("Siglas")),
                            "tipo": _catalog_value(row.get("Clasificación")),
                            "ambito": ambito,
                            "activo": True,
                        })

                if not pending_entes:
                    return

                for payload in pending_entes:
                    db.session.add(Ente(**payload))

                try:
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()
                    for payload in pending_entes:
                        if Ente.query.filter_by(clave=payload["clave"]).first():
                            continue
                        db.session.add(Ente(**payload))
                    db.session.commit()

            def _deactivate_municipal_entes():
                municipales = (
                    Ente.query
                    .filter(
                        Ente.activo.is_(True),
                        func.upper(func.coalesce(Ente.ambito, "")) == "MUNICIPAL",
                    )
                    .all()
                )
                if not municipales:
                    return

                for ente in municipales:
                    ente.activo = False

                db.session.commit()

            def _deactivate_decimal_clave_entes():
                decimales = (
                    Ente.query
                    .filter(
                        Ente.activo.is_(True),
                        Ente.codigo.like("%.%"),
                    )
                    .all()
                )
                if not decimales:
                    return
                for ente in decimales:
                    ente.activo = False
                db.session.commit()

            def _backfill_entes_dd_match_from_dd():
                entes = Ente.query.filter_by(activo=True).all()
                changed = False
                for ente in entes:
                    current_match = str(getattr(ente, "dd_match", "") or "").strip()
                    current_dd = str(getattr(ente, "dd", "") or "").strip()
                    if current_match or not current_dd:
                        continue
                    ente.dd_match = current_dd
                    changed = True
                if changed:
                    db.session.commit()

            def _seed_entes_dd_match():
                dd_rules = [
                    (_normalize_nombre("PODER LEGISLATIVO DEL ESTADO DE TLAXCALA"), "01"),
                    (_normalize_nombre("PODER JUDICIAL DEL ESTADO DE TLAXCALA"), "02"),
                    (_normalize_nombre("UNIVERSIDAD AUTÓNOMA DE TLAXCALA"), "3"),
                    (_normalize_nombre("DESPACHO DE LA GOBERNADORA"), "4"),
                    (_normalize_nombre("SECRETARÍA DE GOBIERNO"), "5"),
                    (_normalize_nombre("OFICIALÍA MAYOR DE GOBIERNO"), "6"),
                    (_normalize_nombre("SECRETARÍA DE FINANZAS"), "8"),
                    (_normalize_nombre("SECRETARÍA DE DESARROLLO ECONÓMICO"), "0B"),
                    (_normalize_nombre("SECRETARÍA DE TURISMO"), "0C"),
                    (_normalize_nombre("SECRETARÍA DE INFRAESTRUCTURA"), "0D"),
                    (_normalize_nombre("SECRETARÍA DE EDUCACIÓN PÚBLICA"), "0E"),
                    (_normalize_nombre("SECRETARÍA DE MOVILIDAD Y TRANSPORTE"), "0F"),
                    (_normalize_nombre("O.P.D SALUD DE TLAXCALA"), "0G"),
                    (_normalize_nombre("SECRETARÍA ANTICORRUPCIÓN Y BUEN GOBIERNO"), "0H"),
                    (_normalize_nombre("SECRETARÍA DE IMPULSO AGROPECUARIO"), "0I"),
                    (_normalize_nombre("COORDINACIÓN DE COMUNICACIÓN"), "0K"),
                    (_normalize_nombre("SECRETARÍA DE MEDIO AMBIENTE"), "0L"),
                    (_normalize_nombre("COMISIÓN ESTATAL DE DERECHOS HUMANOS"), "0N"),
                    (_normalize_nombre("INSTITUTO TLAXCALTECA DE ELECCIONES"), "0O"),
                    (_normalize_nombre("COORDINACIÓN ESTATAL DE PROTECCIÓN CIVIL"), "0P"),
                    (_normalize_nombre("CONSEJO ESTATAL DE POBLACIÓN"), "0Q"),
                    (_normalize_nombre("SECRETARIADO EJECUTIVO DEL SISTEMA ESTATAL DE SEGURIDAD PÚBLICA"), "0R"),
                    (_normalize_nombre("EL COLEGIO DE TLAXCALA A.C."), "1A"),
                    (_normalize_nombre("CENTRO DE CONCILIACIÓN LABORAL DEL ESTADO DE TLAXCALA"), "20"),
                    (_normalize_nombre("SECRETARÍA DE BIENESTAR"), "21"),
                    (_normalize_nombre("SECRETARÍA DE TRABAJO Y COMPETITIVIDAD"), "22"),
                    (_normalize_nombre("MUNICIPIOS"), "0A"),
                    (_normalize_nombre("TRIBUNAL DE JUSTICIA ADMINISTRATIVA"), "23"),
                    (_normalize_nombre("PROCURADURÍA DE PROTECCIÓN AL AMBIENTE DEL ESTADO DE TLAXCALA"), "24"),
                    (_normalize_nombre("COMISIÓN ESTATAL DEL AGUA Y SANEAMIENTO DEL ESTADO DE TLAXCALA"), "25"),
                    (_normalize_nombre("INSTITUTO DE FAUNA SILVESTRE PARA EL ESTADO DE TLAXCALA"), "26"),
                    (_normalize_nombre("UNIVERSIDAD INTERCULTURAL DE TLAXCALA"), "27"),
                    (_normalize_nombre("ARCHIVO GENERAL E HISTÓRICO DEL ESTADO DE TLAXCALA"), "28"),
                    (_normalize_nombre("FISCALÍA GENERAL DE JUSTICIA DEL ESTADO DE TLAXCALA"), "2A"),
                    (_normalize_nombre("CONSEJERÍA JURÍDICA DEL EJECUTIVO"), "2B"),
                    (_normalize_nombre("ALL MUNICIPIOS"), "0A"),
                ]
                dd_siglas_map = {
                    _normalize_nombre("CORACYT"): "0X",
                    _normalize_nombre("COLTLAX"): "1A",
                    _normalize_nombre("CEAVIT"): "1H",
                    _normalize_nombre("FOMTLAX"): "0W",
                    _normalize_nombre("ICATLAX"): "1K",
                    _normalize_nombre("ITST"): "16",
                    _normalize_nombre("ITIFE"): "14",
                    _normalize_nombre("SFP"): "0H",
                    _normalize_nombre("UPT"): "15",
                    _normalize_nombre("SMET"): "1C",
                    _normalize_nombre("SOTyV"): "1Q",
                    _normalize_nombre("SSC"): "1R",
                    _normalize_nombre("CGPI"): "1Y",
                    _normalize_nombre("ITDT"): "0Y",
                    _normalize_nombre("ITAES"): "1F",
                    _normalize_nombre("CEAM"): "1G",
                    _normalize_nombre("CAT"): "1X",
                    _normalize_nombre("ITJ"): "1I",
                    _normalize_nombre("ITEA"): "18",
                    _normalize_nombre("OPD"): "0G",
                    _normalize_nombre("SEDIF"): "1D",
                    _normalize_nombre("USET"): "1M",
                    _normalize_nombre("UTT"): "17",
                    _normalize_nombre("TCyA"): "1P",
                    _normalize_nombre("SESAET"): "1Z",
                    _normalize_nombre("COBAT"): "13",
                    _normalize_nombre("CECYTE"): "12",
                    _normalize_nombre("IDET"): "10",
                    _normalize_nombre("FIDECIX"): "0U",
                    _normalize_nombre("IDC"): "0S",
                    _normalize_nombre("SECRETARÍA DE CULTURA"): "0Z",
                    _normalize_nombre("OPD_SALUD"): "06",
                    _normalize_nombre("UPTREP"): "1U",
                    _normalize_nombre("TET"): "1W",
                    _normalize_nombre("IAIP"): "1O",
                    _normalize_nombre("CONALEP"): "1N",
                    _normalize_nombre("CRI-ESCUELA"): "06",
                    _normalize_nombre("SC"): "0Z",
                    _normalize_nombre("LA_LIBERTAD"): "0Z",
                    _normalize_nombre("PCET"): "06",
                }
                entes = Ente.query.filter_by(activo=True).all()
                changed = False
                for ente in entes:
                    normalized_nombre = _normalize_nombre(ente.nombre)
                    dd_match = None
                    for needle, dd_value in dd_rules:
                        if needle and needle in normalized_nombre:
                            dd_match = dd_value
                            break
                    if not dd_match and ente.ambito and ente.ambito.strip().upper() == "MUNICIPAL":
                        dd_match = "0A"
                    if not dd_match and ente.siglas:
                        dd_match = dd_siglas_map.get(_normalize_nombre(ente.siglas))
                    if dd_match and len(dd_match) == 1 and dd_match.isdigit():
                        dd_match = dd_match.zfill(2)
                    if not dd_match and getattr(ente, "dd_match", None):
                        current_dd = str(ente.dd_match).strip()
                        if len(current_dd) == 1 and current_dd.isdigit():
                            dd_match = current_dd.zfill(2)
                        else:
                            dd_match = current_dd
                    if not dd_match and ente.dd:
                        current_dd = str(ente.dd).strip()
                        if len(current_dd) == 1 and current_dd.isdigit():
                            dd_match = current_dd.zfill(2)
                        else:
                            dd_match = current_dd
                    if dd_match and ente.dd_match != dd_match:
                        ente.dd_match = dd_match
                        changed = True
                if changed:
                    db.session.commit()

            def _seed_entes_system_dd():
                entes = (
                    Ente.query
                    .filter_by(activo=True)
                    .order_by(
                        func.upper(Ente.ambito).asc(),
                        Ente.codigo.asc(),
                        Ente.id.asc(),
                    )
                    .all()
                )
                sequence_by_prefix = {}
                changed = False

                for ente in entes:
                    prefix = _normalize_system_dd_prefix(ente.siglas, ente.nombre)
                    sequence_by_prefix[prefix] = sequence_by_prefix.get(prefix, 0) + 1
                    system_dd = f"{prefix}{sequence_by_prefix[prefix]:03d}"
                    if ente.dd != system_dd:
                        ente.dd = system_dd
                        changed = True
                if changed:
                    db.session.commit()

            # Seed default user if none exists
            if not Usuario.query.first():
                default_user = Usuario(
                    username="luis",
                    nombre_completo="Luis",
                    email="luis@ofs.gob.mx",
                    password_hash=generate_password_hash("luis2025"),
                    rol="admin",
                    activo=True,
                )
                db.session.add(default_user)
                db.session.commit()

            luis_display_name = "C.P. Luis Felipe Camilo Fuentes"
            luis_user = (
                Usuario.query
                .filter(func.lower(Usuario.username) == "luis")
                .first()
            )
            if luis_user and (luis_user.nombre_completo or "").strip() != luis_display_name:
                luis_user.nombre_completo = luis_display_name
                db.session.commit()

            _ensure_entes_dd_column()
            _ensure_entes_dd_match_column()
            _ensure_transacciones_schema()
            _seed_entes_catalogo()
            _deactivate_municipal_entes()
            _deactivate_decimal_clave_entes()
            _backfill_entes_dd_match_from_dd()
            _seed_entes_dd_match()
            _seed_entes_system_dd()
            _backfill_transacciones_segmentadas()
            _backfill_transacciones_entes()
        except Exception as e:
            print(f"❌ Error al conectar con la base de datos: {str(e)}")
            print(f"   Verifica: DATABASE_URL en .env")
            raise

    # Jobs para tracking de progreso
    jobs = {}
    jobs_lock = threading.Lock()
    JOB_UNSET = object()

    stats_cache = {
        "resumen": {"ts": 0, "data": None},
        "dashboard": {"ts": 0, "data": None},
    }
    stats_cache_lock = threading.Lock()

    def _invalidate_stats_cache():
        with stats_cache_lock:
            for key in stats_cache:
                stats_cache[key]["ts"] = 0
                stats_cache[key]["data"] = None

    def _get_cached_stats(key, ttl, compute_fn):
        now = time.time()
        with stats_cache_lock:
            cached = stats_cache.get(key)
            if cached and cached["data"] is not None and (now - cached["ts"]) < ttl:
                return cached["data"]

        data = compute_fn()
        with stats_cache_lock:
            stats_cache[key] = {"ts": now, "data": data}
        return data

    def _job_snapshot_payload(job):
        return {
            "progress": job.get("progress", 0),
            "message": job.get("message", ""),
            "done": job.get("done", False),
            "error": job.get("error"),
            "current_file": job.get("current_file"),
            "lote_id": job.get("lote_id"),
            "total_registros": job.get("total_registros", 0),
        }

    def _format_job_success_message(total_registros, total_archivos):
        archivos_label = "Archivo" if total_archivos == 1 else "Archivos"
        return (
            f"{archivos_label} procesado{'s' if total_archivos != 1 else ''} con exito. "
            f"{int(total_registros or 0):,} registros agregados."
        )

    def _update_job_state(
        job_id,
        *,
        usuario=JOB_UNSET,
        ente_nombre=JOB_UNSET,
        archivos=JOB_UNSET,
        progress=JOB_UNSET,
        message=JOB_UNSET,
        done=JOB_UNSET,
        error=JOB_UNSET,
        current_file=JOB_UNSET,
        lote_id=JOB_UNSET,
        total_registros=JOB_UNSET,
    ):
        updates = {}
        for key, value in {
            "usuario": usuario,
            "ente_nombre": ente_nombre,
            "archivos": archivos,
            "progress": progress,
            "message": message,
            "done": done,
            "error": error,
            "current_file": current_file,
            "lote_id": lote_id,
            "total_registros": total_registros,
        }.items():
            if value is not JOB_UNSET:
                updates[key] = value

        with jobs_lock:
            job = jobs.setdefault(
                job_id,
                {
                    "progress": 0,
                    "message": "Iniciando...",
                    "done": False,
                    "error": None,
                    "current_file": None,
                    "lote_id": None,
                    "total_registros": 0,
                },
            )
            for key, value in updates.items():
                if key in job:
                    job[key] = value

        try:
            job_row = CargaJob.query.filter_by(job_id=job_id).first()
            if not job_row:
                job_row = CargaJob(job_id=job_id)

            for key, value in updates.items():
                setattr(job_row, key, value)

            job_row.updated_at = datetime.utcnow()
            db.session.add(job_row)
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception("No se pudo persistir el job %s", job_id)

    def _get_job_snapshot(job_id):
        job_row = CargaJob.query.filter_by(job_id=job_id).first()
        if job_row:
            snapshot = job_row.to_dict()
            with jobs_lock:
                jobs[job_id] = {
                    "progress": snapshot.get("progress", 0),
                    "message": snapshot.get("message", ""),
                    "done": snapshot.get("done", False),
                    "error": snapshot.get("error"),
                    "current_file": snapshot.get("current_file"),
                    "lote_id": snapshot.get("lote_id"),
                    "total_registros": snapshot.get("total_registros", 0),
                }
            return _job_snapshot_payload(snapshot)

        with jobs_lock:
            job = jobs.get(job_id)

        if job:
            return _job_snapshot_payload(job)

        return None

    TRANSACTION_FACET_FIELDS = {
        "cuenta_contable": {
            "column": Transaccion.cuenta_contable,
            "match": "prefix",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "cta": {
            "column": Transaccion.cta,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "subcta_cog_cri": {
            "column": Transaccion.subcta_cog_cri,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "ente_nombre": {
            "column": Transaccion.ente_nombre,
            "match": "exact",
            "search_match": "contains",
            "kind": "facet",
            "multiple": True,
        },
        "clv1": {
            "column": Transaccion.clv1,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "clv2": {
            "column": Transaccion.clv2,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "cog": {
            "column": Transaccion.cog,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
        "clv3": {
            "column": Transaccion.clv3,
            "match": "exact",
            "search_match": "prefix",
            "kind": "facet",
            "multiple": True,
        },
    }

    TRANSACTION_TEXT_FIELDS = {
        "nombre_cuenta": {
            "column": Transaccion.nombre_cuenta,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
        "beneficiario": {
            "column": Transaccion.beneficiario,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
        "no_factura": {
            "column": Transaccion.no_factura,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
        "cheque_folio": {
            "column": Transaccion.cheque_folio,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
        "descripcion": {
            "column": Transaccion.descripcion,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
        "poliza": {
            "column": Transaccion.poliza,
            "match": "contains",
            "search_match": "contains",
            "kind": "text",
            "multiple": True,
        },
    }

    TRANSACTION_RANGE_FIELDS = {
        "fecha_inicio": {
            "column": Transaccion.fecha_transaccion,
            "op": "gte",
            "kind": "range",
        },
        "fecha_fin": {
            "column": Transaccion.fecha_transaccion,
            "op": "lte",
            "kind": "range",
        },
    }

    TRANSACTION_FILTERS = {
        **TRANSACTION_FACET_FIELDS,
        **TRANSACTION_TEXT_FIELDS,
        **TRANSACTION_RANGE_FIELDS,
    }
    TRANSACTION_OPTION_FIELDS = [
        *TRANSACTION_FACET_FIELDS.keys(),
        *TRANSACTION_TEXT_FIELDS.keys(),
    ]

    def _sanitize_filter_values(raw_values):
        if isinstance(raw_values, (list, tuple, set)):
            candidates = raw_values
        else:
            candidates = [raw_values]

        sanitized = []
        seen = set()

        for raw_value in candidates:
            if raw_value is None:
                continue

            value = str(raw_value).strip()
            if not value:
                continue

            comparable = value.casefold()
            if comparable in seen:
                continue

            seen.add(comparable)
            sanitized.append(value)

        return sanitized

    def _get_filter_values(filters, key):
        if not filters:
            return []

        raw_value = filters.get(key)
        if raw_value is None:
            return []

        return _sanitize_filter_values(raw_value)

    def _sanitize_transaccion_filters(source):
        sanitized = {}
        if not source:
            return sanitized

        for key, config in TRANSACTION_FILTERS.items():
            raw_values = []
            if hasattr(source, "getlist"):
                raw_values = source.getlist(key)
                if not raw_values and key in source:
                    raw_values = [source.get(key)]
            else:
                raw_values = source.get(key)

            values = _sanitize_filter_values(raw_values)
            if not values:
                continue

            if config["kind"] == "range" or not config.get("multiple"):
                sanitized[key] = values[-1]
            else:
                sanitized[key] = values

        return sanitized

    def _sanitize_transaccion_search_terms(source):
        search_terms = {}
        if not source:
            return search_terms

        for key in TRANSACTION_OPTION_FIELDS:
            raw_value = source.get(f"search_{key}")
            if raw_value is None:
                continue
            value = str(raw_value).strip()
            if value:
                search_terms[key] = value

        return search_terms

    def _parse_filter_date(value):
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return None

    def _build_string_match_expression(column, value, match_mode):
        if match_mode == "exact":
            return column == value
        if match_mode == "prefix":
            return column.like(f"{value}%")
        return column.like(f"%{value}%")

    def _apply_string_match(query, column, value, match_mode):
        return query.filter(_build_string_match_expression(column, value, match_mode))

    def _apply_transaccion_filters(query, filters, exclude_field=None):
        for key, value in (filters or {}).items():
            if key == exclude_field:
                continue

            config = TRANSACTION_FILTERS.get(key)
            if not config:
                continue

            if config["kind"] == "range":
                parsed_date = _parse_filter_date(value)
                if not parsed_date:
                    continue
                if config["op"] == "gte":
                    query = query.filter(config["column"] >= parsed_date)
                elif config["op"] == "lte":
                    query = query.filter(config["column"] <= parsed_date)
                continue

            values = _get_filter_values(filters, key)
            if not values:
                continue

            if len(values) == 1:
                query = _apply_string_match(query, config["column"], values[0], config["match"])
                continue

            query = query.filter(
                or_(
                    *[
                        _build_string_match_expression(config["column"], item, config["match"])
                        for item in values
                    ]
                )
            )

        return query

    def _build_filter_options(field_key, filters, search_term="", limit=None):
        config = TRANSACTION_FILTERS.get(field_key)
        if not config or config["kind"] == "range":
            return [], False

        option_limit = limit or (100 if config["kind"] == "facet" else 12)
        base_query = _apply_transaccion_filters(
            Transaccion.query,
            filters,
            exclude_field=field_key,
        )
        column = config["column"]

        grouped_query = base_query.filter(
            column.isnot(None),
            func.length(func.trim(column)) > 0,
        )

        normalized_search = (search_term or "").strip()
        if normalized_search:
            grouped_query = _apply_string_match(
                grouped_query,
                column,
                normalized_search,
                config.get("search_match", "contains"),
            )

        grouped_query = (
            grouped_query.with_entities(
                column.label("value"),
                func.count(Transaccion.id).label("count"),
            )
            .group_by(column)
            .order_by(func.count(Transaccion.id).desc(), column.asc())
        )

        rows = grouped_query.limit(option_limit + 1).all()
        items = [
            {
                "value": value,
                "label": value,
                "count": int(count or 0),
            }
            for value, count in rows[:option_limit]
            if value is not None and str(value).strip()
        ]

        current_values = _get_filter_values(filters, field_key)
        existing_values = {item["value"] for item in items}
        missing_selected = []

        for current_value in current_values:
            if current_value in existing_values:
                continue

            current_count = _apply_string_match(
                base_query.filter(
                    column.isnot(None),
                    func.length(func.trim(column)) > 0,
                ),
                column,
                current_value,
                config["match"],
            ).count()
            if current_count:
                missing_selected.append(
                    {
                        "value": current_value,
                        "label": current_value,
                        "count": int(current_count),
                    }
                )

        if missing_selected:
            items = missing_selected + items

        return items, len(rows) > option_limit

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if _is_authenticated():
            return redirect(url_for("index"))

        error = None
        next_url = _safe_next_url(request.values.get("next", ""))
        user_priority = {"luis": 0, "juan": 1}
        usuarios_activos = sorted(
            Usuario.query.filter(Usuario.activo.is_(True)).all(),
            key=lambda usuario: (
                user_priority.get((usuario.username or "").strip().lower(), 99),
                (usuario.nombre_completo or usuario.username or "").strip().lower(),
                (usuario.username or "").strip().lower(),
            ),
        )
        selected_username = ""
        selected_display = "usuario"

        if request.method == "POST":
            selected_username = request.form.get("username", "").strip().lower()
            for usuario_activo in usuarios_activos:
                current_username = (usuario_activo.username or "").strip().lower()
                if current_username == selected_username:
                    selected_display = usuario_activo.nombre_completo or usuario_activo.username
                    break

        if request.method == "POST":
            username = selected_username
            password = request.form.get("password", "")
            user = _get_active_user(username)

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

    def _get_example_input_dir():
        candidates = [
            Path(app.root_path) / "examples_SAAGNET" / "input",
            Path(app.root_path) / "example" / "input",
            Path(app.root_path) / "example",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_dir():
                return candidate
        return candidates[0]

    def _get_example_files():
        example_dir = _get_example_input_dir()
        if not example_dir.exists():
            return []
        files = []
        for pattern in ("*.xlsx", "*.xls", "*.xlsm"):
            files.extend(sorted(example_dir.glob(pattern)))
        return files

    def _get_loaded_archivos():
        loaded = set()
        for (archivos,) in db.session.query(LoteCarga.archivos).all():
            if not archivos:
                continue
            for archivo in archivos:
                if archivo:
                    loaded.add(Path(archivo).name)

        for (archivo_origen,) in db.session.query(Transaccion.archivo_origen).distinct().all():
            if archivo_origen:
                loaded.add(Path(archivo_origen).name)

        return loaded

    def _load_fuentes_catalogo_records():
        catalogo_path = Path(app.root_path) / "catalogos" / "Fuentes_de_Financiamientos.xlsx"
        if not catalogo_path.exists():
            raise FileNotFoundError("No se encontró el archivo de catálogo")

        df = pd.read_excel(catalogo_path, dtype=object)
        df = df.rename(columns={
            "FF": "ff",
            "FUENTE DE FINANCIAMIENTO": "fuente",
            "ID": "id_fuente",
            "ALFA": "alfa",
            "DESCRIPCION": "descripcion",
            "RAMO FEDERAL": "ramo_federal",
            "FONDO DE INGRESO": "fondo_ingreso",
        })

        expected_columns = [
            "ff",
            "fuente",
            "id_fuente",
            "alfa",
            "descripcion",
            "ramo_federal",
            "fondo_ingreso",
        ]
        for column in expected_columns:
            if column not in df.columns:
                df[column] = None

        df = df[expected_columns]
        df = df.astype(object).where(pd.notna(df), None)

        return df.to_dict(orient="records")

    def _serialize_selected_ente(ente):
        return {
            "ente_clave": str(ente.clave or "").strip(),
            "ente_codigo": str(ente.codigo or "").strip(),
            "ente_dd": str(ente.dd or "").strip(),
            "ente_nombre": str(ente.nombre or "").strip(),
            "ente_siglas": str(ente.siglas or "").strip(),
            "ente_ambito": str(ente.ambito or "").strip(),
        }

    def _header_matches_selected_ente(header_text, ente):
        return _header_match_score(header_text, ente) > 0

    # ==================== RUTAS PRINCIPALES ====================

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/reporte-online")
    def reporte_online():
        return render_template("reporte_online.html")

    @app.route("/reporte-resumen")
    def reporte_resumen():
        return redirect(url_for("reporte_online", view="resumen") + "#resumen-general")

    @app.route("/catalogo")
    def catalogo():
        return render_template("catalogo.html")

    @app.route("/catalogo-entes")
    def catalogo_entes():
        return render_template("catalogo_entes.html")

    @app.route("/catalogo-fuentes")
    def catalogo_fuentes():
        return redirect(url_for("catalogo_entes"))

    @app.route("/catalogo-consulta")
    def catalogo_consulta():
        return render_template("catalogo_consulta.html")

    # ==================== API DE CARGA ====================

    @app.route("/api/process", methods=["POST"])
    def process():
        try:
            files = request.files.getlist("archivo")
            usuario = request.form.get("usuario") or session.get("auth_user") or "sistema"
            ente_clave = request.form.get("ente_clave", "").strip()
            catalog_item_id = request.form.get("catalogo_item_id", "").strip()
            allow_duplicates = request.form.get("allow_duplicates", "false").lower() in (
                "1",
                "true",
                "yes",
            )

            if not files or all(f.filename == "" for f in files):
                return jsonify({"error": "No se subieron archivos"}), 400

            valid_files = []
            for f in files:
                if f.filename:
                    ext = os.path.splitext(f.filename)[1].lower()
                    if ext not in app.config["UPLOAD_EXTENSIONS"]:
                        return jsonify(
                            {"error": f"Archivo {f.filename} tiene extensión no válida"}
                        ), 400
                    valid_files.append(f)

            if not valid_files:
                return jsonify({"error": "No hay archivos válidos"}), 400

            # Resolver ente desde catálogo general o por clave directa
            selected_ente = None
            selected_catalog_item = None
            if catalog_item_id:
                selected_catalog_item = _find_allowed_catalog_item(catalog_item_id)
                if selected_catalog_item and selected_catalog_item.get("ente_clave"):
                    selected_ente = Ente.query.filter_by(
                        clave=selected_catalog_item["ente_clave"], activo=True
                    ).first()
            if not selected_ente and ente_clave:
                selected_ente = Ente.query.filter_by(clave=ente_clave, activo=True).first()
                if not selected_ente:
                    return jsonify({"error": "El ente seleccionado no es válido"}), 400

            active_entes = Ente.query.filter_by(activo=True).all()

            prepared_files = []
            validation_errors = []
            for f in valid_files:
                filename = Path(f.filename).name
                f.seek(0)
                content_bytes = f.read()
                detected_ente = _extract_ente_header((filename, io.BytesIO(content_bytes)))

                if not detected_ente:
                    validation_errors.append({
                        "filename": filename,
                        "detected_ente": "",
                        "selected_ente": selected_ente.nombre if selected_ente else "",
                        "error": "No se pudo identificar el ente en el encabezado del archivo.",
                    })
                    continue

                resolved_ente = _resolve_ente_from_header(detected_ente, active_entes)
                if not resolved_ente and selected_ente and _header_matches_selected_ente(
                    detected_ente,
                    selected_ente,
                ):
                    resolved_ente = selected_ente

                if not resolved_ente:
                    validation_errors.append({
                        "filename": filename,
                        "detected_ente": detected_ente,
                        "selected_ente": selected_ente.nombre if selected_ente else "",
                        "error": "No se encontró un ente activo que coincida con el encabezado detectado.",
                    })
                    continue

                try:
                    validate_excel_file_balance((filename, io.BytesIO(content_bytes)))
                except ValueError as exc:
                    validation_errors.append({
                        "filename": filename,
                        "detected_ente": detected_ente,
                        "selected_ente": resolved_ente.nombre if resolved_ente else "",
                        "error": str(exc),
                    })
                    continue

                prepared_files.append({
                    "filename": filename,
                    "content_bytes": content_bytes,
                    "detected_ente": detected_ente,
                    "resolved_ente": resolved_ente,
                    "ente_payload": _serialize_selected_ente(resolved_ente),
                })

            if validation_errors:
                return jsonify({
                    "error": "La validación del ente falló en uno o más archivos.",
                    "validation_errors": validation_errors,
                }), 400

            loaded = _get_loaded_archivos()
            duplicates = []
            files_to_process = []
            for item in prepared_files:
                filename = item["filename"]
                if filename in loaded:
                    duplicates.append(filename)
                else:
                    files_to_process.append(item)

            if duplicates and not files_to_process and not allow_duplicates:
                return jsonify({
                    "error": "Estos archivos ya fueron procesados anteriormente.",
                    "duplicate_files": duplicates,
                }), 409
            if allow_duplicates:
                files_to_process = prepared_files

            resolved_names = sorted(
                {
                    item["resolved_ente"].nombre
                    for item in files_to_process
                    if item.get("resolved_ente")
                }
            )
            job_ente_name = (
                resolved_names[0]
                if len(resolved_names) == 1
                else "Varios entes"
            )

            job_id = str(uuid.uuid4())
            _update_job_state(
                job_id,
                usuario=usuario,
                ente_nombre=job_ente_name,
                archivos=[item["filename"] for item in files_to_process],
                progress=0,
                message="Iniciando...",
                done=False,
                error=None,
                current_file=None,
                lote_id=None,
                total_registros=0,
            )

            def progress_callback(pct, msg, current_file=None):
                _update_job_state(
                    job_id,
                    progress=pct,
                    message=msg,
                    current_file=current_file,
                )

            files_in_memory = []
            entes_por_archivo = {}
            for item in files_to_process:
                files_in_memory.append((item["filename"], io.BytesIO(item["content_bytes"])))
                entes_por_archivo[item["filename"]] = item["ente_payload"]

            def process_files():
                try:
                    with app.app_context():
                        lote_id, total = process_files_to_database(
                            files_in_memory,
                            usuario,
                            progress_callback,
                            entes_por_archivo=entes_por_archivo,
                        )

                        _update_job_state(
                            job_id,
                            lote_id=lote_id,
                            total_registros=total,
                            done=True,
                            progress=100,
                            message=_format_job_success_message(total, len(files_in_memory)),
                        )
                        _invalidate_stats_cache()

                except Exception as e:
                    _update_job_state(job_id, error=str(e), done=True)

            thread = threading.Thread(target=process_files)
            thread.daemon = True
            thread.start()

            response_payload = {
                "job_id": job_id,
                "ente": job_ente_name,
                "entes_detectados": resolved_names,
            }
            if duplicates:
                response_payload["duplicate_files"] = duplicates
            return jsonify(response_payload)

        except Exception as e:
            print(f"❌ Error procesando archivos: {str(e)}")
            return (
                jsonify(
                    {
                        "error": "Error al procesar archivos",
                        "detalle": str(e),
                        "tipo": type(e).__name__,
                    }
                ),
                500,
            )

    @app.route("/api/example/missing")
    def example_missing():
        try:
            example_files = _get_example_files()
            loaded = _get_loaded_archivos()

            missing = [f.name for f in example_files if f.name not in loaded]

            return jsonify({
                "example_total": len(example_files),
                "loaded_total": len(loaded),
                "missing": missing,
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/example/process", methods=["POST"])
    def process_example():
        try:
            include_loaded = request.args.get("include_loaded", "false").lower() in (
                "1",
                "true",
                "yes",
            )
            usuario = "sistema"
            if request.is_json:
                usuario = request.json.get("usuario", usuario)
            else:
                usuario = request.form.get("usuario", usuario)

            example_files = _get_example_files()
            if not example_files:
                return jsonify({"error": "No hay archivos de ejemplo disponibles"}), 400

            loaded = _get_loaded_archivos()
            files_to_process = [
                f for f in example_files if include_loaded or f.name not in loaded
            ]

            if not files_to_process:
                return jsonify({"message": "No hay archivos pendientes por cargar"}), 200

            active_entes = Ente.query.filter_by(activo=True).all()
            files_in_memory = []
            entes_por_archivo = {}
            for path in files_to_process:
                with path.open("rb") as handle:
                    content_bytes = handle.read()
                    validate_excel_file_balance((path.name, io.BytesIO(content_bytes)))
                    files_in_memory.append((path.name, io.BytesIO(content_bytes)))
                    detected_ente = _extract_ente_header((path.name, io.BytesIO(content_bytes)))
                    if detected_ente:
                        resolved = _resolve_ente_from_header(detected_ente, active_entes)
                        if resolved:
                            entes_por_archivo[path.name] = _serialize_selected_ente(resolved)

            job_id = str(uuid.uuid4())
            _update_job_state(
                job_id,
                usuario=usuario,
                archivos=[p.name for p in files_to_process],
                progress=0,
                message="Iniciando...",
                done=False,
                error=None,
                current_file=None,
                lote_id=None,
                total_registros=0,
            )

            def progress_callback(pct, msg, current_file=None):
                _update_job_state(
                    job_id,
                    progress=pct,
                    message=msg,
                    current_file=current_file,
                )

            def process_files():
                try:
                    with app.app_context():
                        lote_id, total = process_files_to_database(
                            files_in_memory, usuario, progress_callback,
                            entes_por_archivo=entes_por_archivo,
                        )

                        _update_job_state(
                            job_id,
                            lote_id=lote_id,
                            total_registros=total,
                            done=True,
                            progress=100,
                            message=_format_job_success_message(total, len(files_in_memory)),
                        )
                        _invalidate_stats_cache()

                except Exception as e:
                    _update_job_state(job_id, error=str(e), done=True)

            thread = threading.Thread(target=process_files)
            thread.daemon = True
            thread.start()

            return jsonify({
                "job_id": job_id,
                "archivos": [p.name for p in files_to_process],
            })

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/archivos-procesados")
    def archivos_procesados():
        try:
            lotes = LoteCarga.query.order_by(LoteCarga.fecha_carga.desc()).all()
            archivos = []
            archivos_map = {}

            for lote in lotes:
                tipo_archivo = getattr(lote, "tipo_archivo", None) or "auxiliar"
                if not lote.archivos:
                    continue
                for archivo in lote.archivos:
                    if not archivo:
                        continue
                    nombre = Path(archivo).name
                    if nombre in archivos_map:
                        continue
                    payload = {
                        "archivo": nombre,
                        "tipo_archivo": tipo_archivo,
                        "fecha_carga": (
                            lote.fecha_carga.isoformat() if lote.fecha_carga else None
                        ),
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
            return (
                jsonify(
                    {
                        "error": "Error al obtener archivos procesados",
                        "detalle": str(e),
                    }
                ),
                500,
            )

    # ==================== STREAM DE PROGRESO ====================

    @app.route("/api/progress/<job_id>/status")
    def progress_status(job_id):
        job = _get_job_snapshot(job_id)
        if not job:
            return jsonify({"error": "Job no encontrado"}), 404
        return jsonify(job)

    @app.route("/api/progress/<job_id>")
    def progress_stream(job_id):
        def generate():
            last_progress = -1
            max_wait = 300
            start_time = time.time()
            heartbeat_interval = 10
            last_emit = 0

            while True:
                if time.time() - start_time > max_wait:
                    yield f"data: {json.dumps({'progress': 100, 'message': 'Timeout', 'done': True})}\n\n"
                    break

                job = _get_job_snapshot(job_id)
                if not job:
                    now = time.time()
                    if (now - last_emit) >= heartbeat_interval:
                        yield ": waiting\n\n"
                        last_emit = now
                    time.sleep(0.5)
                    continue

                current_progress = job.get("progress", 0)
                message = job.get("message", "")
                done = job.get("done", False)
                error = job.get("error", None)
                current_file = job.get("current_file")
                lote_id = job.get("lote_id")
                total_registros = job.get("total_registros", 0)

                if current_progress != last_progress or done or error:
                    data = {
                        "progress": current_progress,
                        "message": message,
                        "done": done,
                        "error": error,
                        "current_file": current_file,
                        "lote_id": lote_id,
                        "total_registros": total_registros,
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    last_progress = current_progress
                    last_emit = time.time()
                else:
                    now = time.time()
                    if (now - last_emit) >= heartbeat_interval:
                        yield ": keep-alive\n\n"
                        last_emit = now

                if done or error:
                    break

                time.sleep(0.5)

        return Response(generate(), mimetype="text/event-stream")

    # ==================== API DE CONSULTAS ====================

    @app.route("/api/transacciones")
    def get_transacciones():
        try:
            page = request.args.get("page", 1, type=int)
            per_page = request.args.get("per_page", 50, type=int)
            include_totals = request.args.get("include_totals", "false").lower() in (
                "1",
                "true",
                "yes",
            )
            filtros = _sanitize_transaccion_filters(request.args)
            base_query = _apply_transaccion_filters(Transaccion.query, filtros)
            query = base_query.order_by(Transaccion.fecha_transaccion.desc())
            paginated = query.paginate(page=page, per_page=per_page, error_out=False)

            response_payload = {
                "transacciones": [t.to_dict() for t in paginated.items],
                "total": paginated.total,
                "pages": paginated.pages,
                "page": page,
            }

            if include_totals:
                totales = base_query.with_entities(
                    func.coalesce(func.sum(Transaccion.cargos), 0),
                    func.coalesce(func.sum(Transaccion.abonos), 0),
                ).first()
                total_cargos = float(totales[0] or 0)
                total_abonos = float(totales[1] or 0)
                response_payload.update({
                    "total_cargos": total_cargos,
                    "total_abonos": total_abonos,
                    "total_diferencia": total_cargos - total_abonos,
                })

            return jsonify(response_payload)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/transacciones/filtros")
    def get_transacciones_filtros():
        try:
            filtros = _sanitize_transaccion_filters(request.args)
            search_terms = _sanitize_transaccion_search_terms(request.args)
            requested_fields = [
                field.strip()
                for field in request.args.get("fields", "").split(",")
                if field.strip() in TRANSACTION_OPTION_FIELDS
            ]

            if not requested_fields:
                requested_fields = list(TRANSACTION_OPTION_FIELDS)

            options = {}
            for field_key in requested_fields:
                items, truncated = _build_filter_options(
                    field_key,
                    filtros,
                    search_term=search_terms.get(field_key, ""),
                )
                options[field_key] = {
                    "kind": TRANSACTION_FILTERS[field_key]["kind"],
                    "items": items,
                    "truncated": truncated,
                }

            return jsonify({
                "filtros_aplicados": filtros,
                "options": options,
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dependencias/lista")
    def get_dependencias():
        try:
            deps = db.session.query(Transaccion.subcta_cog_cri).distinct().filter(
                Transaccion.subcta_cog_cri.isnot(None)
            ).order_by(Transaccion.subcta_cog_cri).all()
            return jsonify({"dependencias": [d[0] for d in deps if d[0]]})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/transacciones/resumen")
    def get_transacciones_resumen():
        try:
            filtros = _sanitize_transaccion_filters(request.args)

            def compute_resumen():
                query = _apply_transaccion_filters(Transaccion.query, filtros)
                totales = query.with_entities(
                    func.count(Transaccion.id),
                    func.coalesce(func.sum(Transaccion.cargos), 0),
                    func.coalesce(func.sum(Transaccion.abonos), 0),
                ).first()

                total_registros = int(totales[0] or 0)
                total_cargos = float(totales[1] or 0)
                total_abonos = float(totales[2] or 0)
                diferencia = total_cargos - total_abonos
                coincide = abs(diferencia) < 0.005

                return {
                    "total_registros": total_registros,
                    "total_cargos": total_cargos,
                    "total_abonos": total_abonos,
                    "diferencia": diferencia,
                    "coincide": coincide,
                }

            filtros_cache_key = json.dumps(filtros, sort_keys=True, ensure_ascii=False)
            payload = _get_cached_stats(f"resumen_{filtros_cache_key}", 30, compute_resumen)
            return jsonify(payload)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/transacciones/fix-entes", methods=["POST"])
    def fix_missing_entes():
        """Re-asigna entes a transacciones que no tienen ente asignado,
        extrayendo el nombre del ente desde el encabezado del archivo original."""
        try:
            active_entes = Ente.query.filter_by(activo=True).all()
            if not active_entes:
                return jsonify({"error": "No hay entes activos en el catálogo"}), 400

            missing = db.session.query(
                Transaccion.archivo_origen
            ).filter(
                (Transaccion.ente_nombre == None) |  # noqa: E711
                (Transaccion.ente_nombre == "")
            ).distinct().all()

            archivos_sin_ente = [r[0] for r in missing]
            if not archivos_sin_ente:
                return jsonify({"message": "No hay transacciones sin ente asignado", "fixed": 0})

            example_dir = _get_example_input_dir()
            fixed_total = 0
            details = []

            for archivo in archivos_sin_ente:
                file_path = example_dir / archivo
                if not file_path.exists():
                    lote = LoteCarga.query.filter(
                        LoteCarga.archivos.contains(archivo)
                    ).first()
                    details.append({
                        "archivo": archivo,
                        "status": "skipped",
                        "reason": "Archivo original no encontrado"
                    })
                    continue

                with file_path.open("rb") as fh:
                    detected = _extract_ente_header((archivo, io.BytesIO(fh.read())))

                if not detected:
                    details.append({
                        "archivo": archivo,
                        "status": "skipped",
                        "reason": "No se detectó ente en encabezado"
                    })
                    continue

                resolved = _resolve_ente_from_header(detected, active_entes)
                if not resolved:
                    details.append({
                        "archivo": archivo,
                        "status": "skipped",
                        "reason": f"Ente detectado '{detected}' no coincide con catálogo"
                    })
                    continue

                payload = _serialize_selected_ente(resolved)
                count = Transaccion.query.filter(
                    Transaccion.archivo_origen == archivo,
                    (Transaccion.ente_nombre == None) | (Transaccion.ente_nombre == "")  # noqa: E711
                ).update({
                    Transaccion.ente_clave: payload["ente_clave"],
                    Transaccion.ente_codigo: payload["ente_codigo"],
                    Transaccion.ente_dd: payload["ente_dd"],
                    Transaccion.ente_nombre: payload["ente_nombre"],
                    Transaccion.ente_siglas: payload["ente_siglas"],
                    Transaccion.ente_ambito: payload["ente_ambito"],
                }, synchronize_session=False)
                db.session.commit()
                fixed_total += count
                details.append({
                    "archivo": archivo,
                    "status": "fixed",
                    "ente": payload["ente_nombre"],
                    "registros": count,
                })

            _invalidate_stats_cache()
            return jsonify({
                "message": f"Se corrigieron {fixed_total} registros",
                "fixed": fixed_total,
                "details": details,
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/reportes/generar", methods=["POST"])
    def generar_reporte():
        try:
            filtros = _sanitize_transaccion_filters(request.json or {})
            query = _apply_transaccion_filters(Transaccion.query, filtros)

            query = query.order_by(Transaccion.fecha_transaccion, Transaccion.cuenta_contable)
            transacciones = query.limit(100000).all()

            # Crear Excel
            output = io.BytesIO()
            df = pd.DataFrame([{
                'Cuenta Contable': t.cuenta_contable,
                'Cta.': t.cta,
                'SubCta/COG/CRI': t.subcta_cog_cri,
                'Clv1': t.clv1,
                'Clv2': t.clv2,
                'COG': t.cog,
                'Clv3': t.clv3,
                'Nombre de Cuenta': t.nombre_cuenta,
                'Póliza': t.poliza,
                'Fecha': t.fecha_transaccion.strftime('%Y-%m-%d') if t.fecha_transaccion else '',
                'Beneficiario': t.beneficiario,
                'No. Factura': t.no_factura,
                'Cheque/Folio': t.cheque_folio,
                'Concepto': t.descripcion,
                'Saldo Inicial': float(t.saldo_inicial) if t.saldo_inicial else 0,
                'Cargos': float(t.cargos) if t.cargos else 0,
                'Abonos': float(t.abonos) if t.abonos else 0,
                'Saldos': float(t.saldo_final) if t.saldo_final else 0,
            } for t in transacciones])

            df.to_excel(output, index=False, sheet_name='Aux_Final')
            output.seek(0)

            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=f'reporte_saacgnet_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dashboard/stats")
    def dashboard_stats():
        try:
            def compute_dashboard():
                stats = db.session.query(
                    func.count(Transaccion.id),
                    func.count(func.distinct(Transaccion.cuenta_contable)),
                    func.count(func.distinct(Transaccion.ente_nombre)),
                    func.coalesce(func.sum(Transaccion.cargos), 0),
                    func.coalesce(func.sum(Transaccion.abonos), 0),
                ).first()

                total_transacciones = int(stats[0] or 0)
                total_cuentas = int(stats[1] or 0)
                total_entes = int(stats[2] or 0)
                suma_cargos = float(stats[3] or 0)
                suma_abonos = float(stats[4] or 0)

                ultimos_lotes = (
                    LoteCarga.query.order_by(LoteCarga.fecha_carga.desc()).limit(5).all()
                )

                transacciones_mes = (
                    db.session.query(
                        func.date_trunc("month", Transaccion.fecha_transaccion).label("mes"),
                        func.count(Transaccion.id).label("total"),
                    )
                    .group_by("mes")
                    .order_by("mes")
                    .all()
                )

                return {
                    "total_transacciones": total_transacciones,
                    "total_cuentas": total_cuentas,
                    "total_dependencias": total_entes,
                    "total_entes": total_entes,
                    "suma_cargos": suma_cargos,
                    "suma_abonos": suma_abonos,
                    "ultimos_lotes": [l.to_dict() for l in ultimos_lotes],
                    "transacciones_mes": [
                        {"mes": str(mes), "total": total}
                        for mes, total in transacciones_mes
                    ],
                }

            payload = _get_cached_stats("dashboard", 30, compute_dashboard)
            return jsonify(payload)
        except Exception as e:
            print(f"❌ Error en dashboard/stats: {str(e)}")
            return (
                jsonify(
                    {"error": "Error al obtener estadísticas", "detalle": str(e)}
                ),
                500,
            )

    # ==================== API CATÁLOGO GENERAL ====================

    @app.route("/api/catalogo-general")
    def get_catalogo_general():
        try:
            return jsonify(_get_catalogo_general_selection_payload())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/catalogo-consulta")
    def get_catalogo_consulta():
        try:
            return jsonify(_get_catalogo_consulta_payload())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ==================== API CATÁLOGO DE ENTES ====================

    @app.route("/api/entes")
    def get_entes():
        try:
            entes = (
                Ente.query
                .filter(Ente.activo.is_(True))
                .order_by(Ente.ambito.asc(), cast(Ente.codigo, db.Integer).asc())
                .all()
            )
            return jsonify({
                "entes": [e.to_dict() for e in entes],
                "total": len(entes)
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/entes/lista")
    def get_entes_lista():
        try:
            rows = (
                db.session.query(Transaccion.ente_nombre)
                .distinct()
                .filter(
                    Transaccion.ente_nombre.isnot(None),
                    func.length(func.trim(Transaccion.ente_nombre)) > 0,
                )
                .order_by(Transaccion.ente_nombre.asc())
                .all()
            )
            return jsonify({"entes": [row[0] for row in rows if row[0]]})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/entes", methods=["POST"])
    def create_ente():
        try:
            data = request.json
            ambito = str(data.get('ambito', 'ESTATAL') or 'ESTATAL').strip().upper()

            if ambito != 'ESTATAL':
                return jsonify({"error": "Solo se permiten entes estatales en este catálogo"}), 400

            # Validar que la clave no exista
            if Ente.query.filter_by(clave=data['clave']).first():
                return jsonify({"error": "La clave ya existe"}), 400

            ente = Ente(
                clave=data['clave'],
                codigo=data['codigo'],
                dd=data.get('dd', ''),
                nombre=data['nombre'],
                siglas=data.get('siglas', ''),
                tipo=data.get('tipo', ''),
                ambito=ambito
            )
            db.session.add(ente)
            db.session.commit()

            return jsonify({"success": True, "ente": ente.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/entes/<int:ente_id>", methods=["PUT"])
    def update_ente(ente_id):
        try:
            ente = Ente.query.get_or_404(ente_id)
            data = request.json
            ambito = str(data.get('ambito', ente.ambito or 'ESTATAL') or 'ESTATAL').strip().upper()

            if ambito != 'ESTATAL':
                return jsonify({"error": "Solo se permiten entes estatales en este catálogo"}), 400

            ente.nombre = data.get('nombre', ente.nombre)
            ente.siglas = data.get('siglas', ente.siglas)
            ente.tipo = data.get('tipo', ente.tipo)
            ente.ambito = ambito
            ente.dd = data.get('dd', ente.dd)

            db.session.commit()
            return jsonify({"success": True, "ente": ente.to_dict()})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/entes/<int:ente_id>", methods=["DELETE"])
    def delete_ente(ente_id):
        try:
            ente = Ente.query.get_or_404(ente_id)
            ente.activo = False
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # ==================== API CATÁLOGO DE FUENTES ====================

    @app.route("/api/fuentes")
    def get_fuentes():
        try:
            fuentes = _load_fuentes_catalogo_records()
            return jsonify({
                "fuentes": fuentes,
                "total": len(fuentes),
            })
        except FileNotFoundError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ==================== ERRORES ====================

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "El archivo es demasiado grande. Máximo 500 MB"}), 413

    @app.errorhandler(404)
    def not_found(e):
        return (
            jsonify(
                {
                    "error": str(e.description)
                    if hasattr(e, "description")
                    else "No encontrado"
                }
            ),
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(e):
        return (
            jsonify(
                {
                    "error": "Método no permitido",
                    "detalle": str(e.description)
                    if hasattr(e, "description")
                    else "Método no permitido",
                }
            ),
            405,
        )

    @app.errorhandler(500)
    def internal_error(e):
        print(f"❌ Error 500: {str(e)}")
        return (
            jsonify({"error": "Error interno del servidor", "detalle": str(e)}),
            500,
        )

    return app


if __name__ == "__main__":
    app = create_app("development")

    print("\n" + "=" * 50)
    print("SAAGNET - Sistema de Procesamiento de Auxiliares Contables")
    print("=" * 50)
    print(f"✓ Servidor iniciado en puerto {config['development'].PORT}")
    print("\nPáginas disponibles:")
    print("  → http://localhost:5021          (Carga)")
    print("  → http://localhost:5021/dashboard (Dashboard)")
    print("  → http://localhost:5021/reportes  (Reportes)")
    print("=" * 50 + "\n")

    app.run(host="0.0.0.0", port=config["development"].PORT, debug=True, threaded=True)
