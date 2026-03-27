from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from io import BytesIO
import hashlib
from typing import Callable, List, Optional, Tuple
import logging
import re
import traceback
import uuid

import pandas as pd
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Index

# Base de datos

db = SQLAlchemy()


class Transaccion(db.Model):
    """Modelo para transacciones contables"""
    __tablename__ = 'transacciones'

    id = db.Column(db.Integer, primary_key=True)

    # Información de carga
    lote_id = db.Column(db.String(36), nullable=False, index=True)
    archivo_origen = db.Column(db.String(255), nullable=False)
    fecha_carga = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    usuario_carga = db.Column(db.String(100))

    # Cuenta contable completa
    cuenta_contable = db.Column(db.String(64), nullable=False, index=True)
    nombre_cuenta = db.Column(db.Text)
    cta = db.Column(db.String(20), index=True)
    subcta_cog_cri = db.Column(db.String(20), index=True)
    clv1 = db.Column(db.String(20), index=True)
    clv2 = db.Column(db.String(20), index=True)
    cog = db.Column(db.String(20), index=True)
    clv3 = db.Column(db.String(20), index=True)
    ente_clave = db.Column(db.String(20), index=True)
    ente_codigo = db.Column(db.String(50))
    ente_dd = db.Column(db.String(10), index=True)
    ente_nombre = db.Column(db.String(255), index=True)
    ente_siglas = db.Column(db.String(50))
    ente_ambito = db.Column(db.String(50), index=True)

    # Componentes de cuenta (formato vertical)
    genero = db.Column(db.String(1), index=True)
    grupo = db.Column(db.String(1), index=True)
    rubro = db.Column(db.String(1), index=True)
    cuenta = db.Column(db.String(1), index=True)
    subcuenta = db.Column(db.String(1), index=True)
    dependencia = db.Column(db.String(2), index=True)
    unidad_responsable = db.Column(db.String(2), index=True)
    centro_costo = db.Column(db.String(2), index=True)
    proyecto_presupuestario = db.Column(db.String(2), index=True)
    fuente = db.Column(db.String(1), index=True)
    subfuente = db.Column(db.String(2), index=True)
    tipo_recurso = db.Column(db.String(1), index=True)
    partida_presupuestal = db.Column(db.String(4), index=True)

    # Datos de transacción
    fecha_transaccion = db.Column(db.Date, nullable=False, index=True)
    poliza = db.Column(db.String(50), index=True)
    beneficiario = db.Column(db.Text)
    no_factura = db.Column(db.String(100))
    cheque_folio = db.Column(db.String(100))
    descripcion = db.Column(db.Text)
    orden_pago = db.Column(db.String(50))

    # Montos
    saldo_inicial = db.Column(db.Numeric(15, 2), default=0)
    cargos = db.Column(db.Numeric(15, 2), default=0)
    abonos = db.Column(db.Numeric(15, 2), default=0)
    saldo_final = db.Column(db.Numeric(15, 2), default=0)
    hash_registro = db.Column(db.String(64), unique=True, index=True)

    # Índices compuestos para consultas comunes
    __table_args__ = (
        Index('idx_cuenta_fecha', 'cuenta_contable', 'fecha_transaccion'),
        Index('idx_dependencia_fecha', 'dependencia', 'fecha_transaccion'),
        Index('idx_lote_cuenta', 'lote_id', 'cuenta_contable'),
    )

    def to_dict(self):
        """Convierte el modelo a diccionario"""
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'archivo_origen': self.archivo_origen,
            'fecha_carga': self.fecha_carga.isoformat() if self.fecha_carga else None,
            'cuenta_contable': self.cuenta_contable,
            'nombre_cuenta': self.nombre_cuenta,
            'cta': self.cta,
            'subcta_cog_cri': self.subcta_cog_cri,
            'clv1': self.clv1,
            'clv2': self.clv2,
            'cog': self.cog,
            'clv3': self.clv3,
            'ente_clave': self.ente_clave,
            'ente_codigo': self.ente_codigo,
            'ente_dd': self.ente_dd,
            'ente_nombre': self.ente_nombre,
            'ente_siglas': self.ente_siglas,
            'ente_ambito': self.ente_ambito,
            'genero': self.genero,
            'grupo': self.grupo,
            'rubro': self.rubro,
            'cuenta': self.cuenta,
            'subcuenta': self.subcuenta,
            'dependencia': self.dependencia,
            'unidad_responsable': self.unidad_responsable,
            'centro_costo': self.centro_costo,
            'proyecto_presupuestario': self.proyecto_presupuestario,
            'fuente': self.fuente,
            'subfuente': self.subfuente,
            'tipo_recurso': self.tipo_recurso,
            'partida_presupuestal': self.partida_presupuestal,
            'fecha_transaccion': self.fecha_transaccion.strftime('%d/%m/%Y') if self.fecha_transaccion else None,
            'poliza': self.poliza,
            'beneficiario': self.beneficiario,
            'no_factura': self.no_factura,
            'cheque_folio': self.cheque_folio,
            'concepto': self.descripcion,
            'descripcion': self.descripcion,
            'orden_pago': self.orden_pago,
            'saldo_inicial': float(self.saldo_inicial) if self.saldo_inicial else 0,
            'cargos': float(self.cargos) if self.cargos else 0,
            'abonos': float(self.abonos) if self.abonos else 0,
            'saldo_final': float(self.saldo_final) if self.saldo_final else 0,
            'saldos': float(self.saldo_final) if self.saldo_final else 0,
        }


class LoteCarga(db.Model):
    """Modelo para rastrear lotes de carga"""
    __tablename__ = 'lotes_carga'

    id = db.Column(db.Integer, primary_key=True)
    lote_id = db.Column(db.String(36), unique=True, nullable=False, index=True)
    fecha_carga = db.Column(db.DateTime, default=datetime.utcnow)
    usuario = db.Column(db.String(100))
    archivos = db.Column(db.JSON)  # Lista de archivos procesados
    tipo_archivo = db.Column(db.String(20))
    total_registros = db.Column(db.Integer, default=0)
    estado = db.Column(db.String(20), default='procesando')  # procesando, completado, error
    mensaje = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'lote_id': self.lote_id,
            'fecha_carga': self.fecha_carga.isoformat() if self.fecha_carga else None,
            'usuario': self.usuario,
            'archivos': self.archivos,
            'tipo_archivo': self.tipo_archivo,
            'total_registros': self.total_registros,
            'estado': self.estado,
            'mensaje': self.mensaje
        }


class Usuario(db.Model):
    """Modelo para usuarios del sistema"""
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    nombre_completo = db.Column(db.String(200))
    email = db.Column(db.String(200))
    password_hash = db.Column(db.String(255))
    rol = db.Column(db.String(50), default='auditor')  # admin, auditor, consulta
    activo = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    ultimo_acceso = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'nombre_completo': self.nombre_completo,
            'email': self.email,
            'rol': self.rol,
            'activo': self.activo
        }


class ReporteGenerado(db.Model):
    """Modelo para rastrear reportes generados"""
    __tablename__ = 'reportes_generados'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    fecha_generacion = db.Column(db.DateTime, default=datetime.utcnow)
    tipo_reporte = db.Column(db.String(50))
    filtros_aplicados = db.Column(db.JSON)
    total_registros = db.Column(db.Integer)
    nombre_archivo = db.Column(db.String(255))

    usuario = db.relationship('Usuario', backref='reportes')

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'fecha_generacion': self.fecha_generacion.isoformat() if self.fecha_generacion else None,
            'tipo_reporte': self.tipo_reporte,
            'filtros_aplicados': self.filtros_aplicados,
            'total_registros': self.total_registros,
            'nombre_archivo': self.nombre_archivo
        }


class CargaJob(db.Model):
    """Modelo para persistir el estado de progreso de las cargas."""
    __tablename__ = 'carga_jobs'

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.String(36), unique=True, nullable=False, index=True)
    usuario = db.Column(db.String(100))
    ente_nombre = db.Column(db.String(255))
    archivos = db.Column(db.JSON)
    progress = db.Column(db.Integer, default=0)
    message = db.Column(db.Text)
    done = db.Column(db.Boolean, default=False, index=True)
    error = db.Column(db.Text)
    current_file = db.Column(db.String(255))
    lote_id = db.Column(db.String(36), index=True)
    total_registros = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        index=True,
    )

    def to_dict(self):
        return {
            'job_id': self.job_id,
            'usuario': self.usuario,
            'ente_nombre': self.ente_nombre,
            'archivos': self.archivos or [],
            'progress': self.progress or 0,
            'message': self.message or '',
            'done': bool(self.done),
            'error': self.error,
            'current_file': self.current_file,
            'lote_id': self.lote_id,
            'total_registros': self.total_registros or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Ente(db.Model):
    """Modelo para catálogo de entes públicos"""
    __tablename__ = 'entes'

    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(20), unique=True, nullable=False, index=True)
    codigo = db.Column(db.String(50), nullable=False)
    dd = db.Column(db.String(10))
    dd_match = db.Column(db.String(10), index=True)
    nombre = db.Column(db.String(255), nullable=False)
    siglas = db.Column(db.String(50))
    tipo = db.Column(db.String(100))
    ambito = db.Column(db.String(50))
    activo = db.Column(db.Boolean, default=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'clave': self.clave,
            'codigo': self.codigo,
            'dd': self.dd,
            'dd_match': self.dd_match,
            'nombre': self.nombre,
            'siglas': self.siglas,
            'tipo': self.tipo,
            'ambito': self.ambito,
            'activo': self.activo,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }


# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BALANCE_TOLERANCE = 0.005


def _norm(s):
    """Normaliza strings para comparación"""
    s = str(s or "").strip().lower()
    rep = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n"}
    for k, v in rep.items():
        s = s.replace(k, v)
    s = re.sub(r"\s+", " ", s)
    return s


def _split_cuenta_contable_vertical(cuenta_str):
    """Divide la cuenta contable en componentes"""
    s = str(cuenta_str).strip().upper()
    s = re.sub(r"[^0-9A-Z]", "", s).ljust(21, "0")

    return {
        "genero": s[0],
        "grupo": s[1],
        "rubro": s[2],
        "cuenta": s[3],
        "subcuenta": s[4],
        "dependencia": s[5:7],
        "unidad_responsable": s[7:9],
        "centro_costo": s[9:11],
        "proyecto_presupuestario": s[11:13],
        "fuente": s[13],
        "subfuente": s[14:16],
        "tipo_recurso": s[16],
        "partida_presupuestal": s[17:21],
    }


def _normalize_segment_number(value):
    raw = str(value or "").strip()
    if not raw:
        return ""
    if raw.isdigit():
        return str(int(raw))
    return raw


def _split_cuenta_contable_segmented(cuenta_str):
    """Divide la cuenta contable usando segmentos separados por '-'."""
    parts = [part.strip().upper() for part in str(cuenta_str or "").split("-") if str(part).strip()]
    result = {
        "cta": "",
        "subcta_cog_cri": "",
        "clv1": "",
        "clv2": "",
        "cog": "",
        "clv3": "",
    }

    if not parts:
        return result

    result["cta"] = parts[0]
    if len(parts) >= 2:
        result["subcta_cog_cri"] = parts[1]
    if len(parts) >= 3:
        result["clv1"] = parts[2]
    if len(parts) >= 4:
        result["clv2"] = _normalize_segment_number(parts[3])
    if len(parts) >= 5:
        result["cog"] = parts[4]
    if len(parts) >= 6:
        result["clv3"] = _normalize_segment_number(parts[5])

    return result


def _normalize_ente_dd(value):
    raw = re.sub(r"[^0-9A-Z]", "", str(value or "").strip().upper())
    if raw.isdigit() and len(raw) == 1:
        return raw.zfill(2)
    return raw


def _normalize_system_dd_prefix(siglas, nombre=""):
    raw = re.sub(r"[^0-9A-Z]", "", str(siglas or "").strip().upper())
    if not raw:
        words = re.findall(r"[A-Z0-9]+", _norm(nombre).upper())
        raw = "".join(word[:1] for word in words[:6])
    if not raw:
        raw = "ENTE"
    return raw[:6]


def _empty_ente_payload():
    return {
        "ente_clave": "",
        "ente_codigo": "",
        "ente_dd": "",
        "ente_nombre": "",
        "ente_siglas": "",
        "ente_ambito": "",
    }


def _build_entes_lookup(entes):
    lookup = {}

    for ente in entes or []:
        dd_source = getattr(ente, "dd_match", "") or getattr(ente, "dd", "")
        dd = _normalize_ente_dd(dd_source)
        if not dd or dd in lookup:
            continue

        lookup[dd] = {
            "ente_clave": str(getattr(ente, "clave", "") or "").strip(),
            "ente_codigo": str(getattr(ente, "codigo", "") or "").strip(),
            "ente_dd": str(getattr(ente, "dd", "") or "").strip(),
            "ente_nombre": str(getattr(ente, "nombre", "") or "").strip(),
            "ente_siglas": str(getattr(ente, "siglas", "") or "").strip(),
            "ente_ambito": str(getattr(ente, "ambito", "") or "").strip(),
        }

    return lookup


def _resolve_ente_catalogo(subcta_value, entes_lookup):
    if not entes_lookup:
        return _empty_ente_payload()

    raw = re.sub(r"[^0-9A-Z]", "", str(subcta_value or "").strip().upper())
    if not raw:
        return _empty_ente_payload()

    candidates = []

    def add_candidate(candidate):
        key = _normalize_ente_dd(candidate)
        if key and key not in candidates:
            candidates.append(key)

    add_candidate(raw)

    if len(raw) > 2:
        add_candidate(raw[:2])
        if raw[:1].isdigit():
            add_candidate(raw[:1])

    for candidate in candidates:
        payload = entes_lookup.get(candidate)
        if payload:
            return dict(payload)

    return _empty_ente_payload()


def _to_numeric_fast(s):
    """Convierte series a numérico de forma rápida"""
    return pd.to_numeric(
        s.astype(str).str.replace(r"[^\d\.-]", "", regex=True),
        errors="coerce"
    ).fillna(0.0)


def _build_balance_summary(df, filename):
    if df is None or df.empty:
        raise ValueError(f"El archivo {filename} no contiene transacciones válidas.")

    total_cargos = float(_to_numeric_fast(df["cargos"]).sum())
    total_abonos = float(_to_numeric_fast(df["abonos"]).sum())
    diferencia = total_cargos - total_abonos

    return {
        "filename": filename,
        "total_registros": int(len(df)),
        "total_cargos": total_cargos,
        "total_abonos": total_abonos,
        "diferencia": diferencia,
        "coincide": abs(diferencia) < BALANCE_TOLERANCE,
    }


def _ensure_balanced_file(df, filename):
    summary = _build_balance_summary(df, filename)
    if not summary["coincide"]:
        raise ValueError(
            "Cargo y Abono no coinciden en "
            f"{filename}: cargos={summary['total_cargos']:.2f}, "
            f"abonos={summary['total_abonos']:.2f}, "
            f"diferencia={summary['diferencia']:.2f}"
        )
    return summary


def _format_amount(val):
    try:
        return f"{float(val):.2f}"
    except Exception:
        return "0.00"


def _hash_transaccion_row(row):
    # Exclude saldo fields since they are recalculated and can differ across sources.
    parts = [
        _norm(row.get("archivo_origen")),
        _norm(row.get("_source_row_number")),
        _norm(row.get("cuenta_contable")),
        _norm(row.get("nombre_cuenta")),
        _norm(row.get("genero")),
        _norm(row.get("grupo")),
        _norm(row.get("rubro")),
        _norm(row.get("cuenta")),
        _norm(row.get("subcuenta")),
        _norm(row.get("dependencia")),
        _norm(row.get("unidad_responsable")),
        _norm(row.get("centro_costo")),
        _norm(row.get("proyecto_presupuestario")),
        _norm(row.get("fuente")),
        _norm(row.get("subfuente")),
        _norm(row.get("tipo_recurso")),
        _norm(row.get("partida_presupuestal")),
        _norm(row.get("poliza")),
        _norm(row.get("beneficiario")),
        _norm(row.get("descripcion")),
        _norm(row.get("orden_pago")),
        _format_amount(row.get("cargos")),
        _format_amount(row.get("abonos")),
    ]

    fecha = row.get("fecha_transaccion")
    if pd.isna(fecha):
        parts.append("")
    else:
        try:
            parts.append(fecha.strftime("%Y-%m-%d"))
        except Exception:
            parts.append(str(fecha))

    fingerprint = "|".join(parts).encode("utf-8")
    return hashlib.sha256(fingerprint).hexdigest()


def validate_excel_file_balance(file_data):
    df, filename = _read_one_excel(file_data)
    return _ensure_balanced_file(df, filename)


def _extract_ente_header(file_data):
    """Obtiene el ente declarado en el encabezado superior del auxiliar."""
    filename, file_content = file_data
    file_content.seek(0)

    try:
        raw = pd.read_excel(
            file_content,
            header=None,
            dtype=str,
            engine="openpyxl",
            nrows=12,
        )
    except Exception as e:
        logger.warning(
            f"No se pudo leer encabezado del ente en {filename}: {type(e).__name__} - {str(e)}"
        )
        file_content.seek(0)
        return ""

    file_content.seek(0)

    if raw.empty:
        return ""

    def _row_text(idx):
        values = []
        for value in raw.iloc[idx].tolist()[:8]:
            if pd.isna(value):
                continue
            text = re.sub(r"\s+", " ", str(value)).strip()
            if text:
                values.append(text)
        return re.sub(r"\s+", " ", " ".join(values)).strip()

    def _is_metadata_line(line):
        normalized = _norm(line)
        if not normalized:
            return False

        if "reporte auxiliar de cuentas" in normalized:
            return True

        if normalized.startswith("del ") and " al " in normalized:
            return True

        metadata_fragments = (
            "con saldo",
            "movimientos",
            "de la cuenta",
            "beneficiario",
            "nombre de la cuenta",
            "no. factura",
            "no factura",
            "cheque/folio",
            "saldo inicial",
            "saldo final",
        )
        if any(fragment in normalized for fragment in metadata_fragments):
            return True

        return normalized.startswith("fecha") or normalized.startswith("poliza")

    def _collect_candidate_block(start_idx, end_idx):
        lines = []
        collecting = False

        for idx in range(start_idx, end_idx):
            line = _row_text(idx)
            normalized = _norm(line)

            if not normalized:
                if collecting and lines:
                    break
                continue

            if _is_metadata_line(line):
                if collecting and lines:
                    break
                continue

            collecting = True
            cleaned = line.strip(" -")
            if not cleaned:
                continue

            if not lines or _norm(cleaned) != _norm(lines[-1]):
                lines.append(cleaned)

        return " ".join(lines).strip()

    title_idx = None
    for idx in range(min(12, len(raw))):
        if "reporte auxiliar de cuentas" in _norm(_row_text(idx)):
            title_idx = idx
            break

    if title_idx is not None:
        candidate = _collect_candidate_block(title_idx + 1, min(title_idx + 8, len(raw)))
        if candidate:
            return candidate

    candidate = _collect_candidate_block(0, min(12, len(raw)))
    if candidate:
        return candidate

    return ""


def _ente_payload_from_selection(ente_seleccionado):
    if not ente_seleccionado:
        return _empty_ente_payload()

    return {
        "ente_clave": str(ente_seleccionado.get("ente_clave", "") or "").strip(),
        "ente_codigo": str(ente_seleccionado.get("ente_codigo", "") or "").strip(),
        "ente_dd": str(ente_seleccionado.get("ente_dd", "") or "").strip(),
        "ente_nombre": str(ente_seleccionado.get("ente_nombre", "") or "").strip(),
        "ente_siglas": str(ente_seleccionado.get("ente_siglas", "") or "").strip(),
        "ente_ambito": str(ente_seleccionado.get("ente_ambito", "") or "").strip(),
    }


def _read_one_excel(file_data):
    """Lee un auxiliar SAACG.NET y extrae las transacciones con el nuevo esquema."""
    filename, file_content = file_data
    logger.info(f"Iniciando lectura de archivo: {filename}")
    file_content.seek(0)

    try:
        raw = pd.read_excel(file_content, header=None, dtype=str, engine="openpyxl")
        logger.info(f"Archivo leído exitosamente: {filename} ({len(raw)} filas)")
    except Exception as e:
        logger.error(f"Error al leer archivo {filename}: {type(e).__name__} - {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return pd.DataFrame(), filename

    if raw.empty or len(raw) < 2:
        logger.warning(f"Archivo vacío o muy pequeño: {filename} ({len(raw)} filas)")
        return pd.DataFrame(), filename

    # Buscar la fila de encabezados del detalle
    header_row_idx = None
    for idx in range(min(20, len(raw))):
        row_text = " ".join(raw.iloc[idx].fillna("").astype(str).str.lower())
        if (
            "fecha" in row_text
            and ("poliza" in row_text or "póliza" in row_text)
            and "beneficiario" in row_text
        ):
            header_row_idx = idx
            logger.info(f"Encabezado encontrado en fila {idx} de {filename}")
            break

    if header_row_idx is None:
        logger.warning(f"No se encontró fila de encabezados en {filename}. Primeras 5 filas:")
        for i in range(min(5, len(raw))):
            logger.warning(
                f"  Fila {i}: {' | '.join(raw.iloc[i].fillna('').astype(str).tolist()[:5])}"
            )
        return pd.DataFrame(), filename

    start_idx = header_row_idx + 1

    records = []
    current_cuenta = None
    current_nombre = None

    def _cell(row, idx):
        if idx >= len(row) or pd.isna(row.iloc[idx]):
            return ""
        return str(row.iloc[idx]).strip()

    def _looks_like_account_code(value):
        candidate = str(value or "").strip().upper()
        return bool(candidate and re.fullmatch(r"[0-9A-Z]+(?:-[0-9A-Z]+)+", candidate))

    def _parse_fecha(value):
        if value is None or pd.isna(value):
            return ""
        try:
            return pd.to_datetime(value).strftime("%Y-%m-%d")
        except Exception:
            return ""

    for idx in range(start_idx, len(raw)):
        row = raw.iloc[idx]
        if row.isna().all():
            continue

        codigo = _cell(row, 1)
        fecha = _cell(row, 2)
        nombre = _cell(row, 3)

        if _looks_like_account_code(codigo) and not fecha:
            current_cuenta = codigo.upper()
            current_nombre = nombre
            continue

        if not current_cuenta or not codigo:
            continue

        fecha_normalizada = _parse_fecha(fecha)
        if not fecha_normalizada:
            continue

        record = {
            "cuenta_contable": current_cuenta,
            "nombre_cuenta": current_nombre,
            "fecha": fecha_normalizada,
            "poliza": codigo,
            "beneficiario": _cell(row, 3),
            "no_factura": _cell(row, 4),
            "cheque_folio": _cell(row, 5),
            "descripcion": _cell(row, 6),
            "orden_pago": _cell(row, 5),
            "saldo_inicial": _cell(row, 7),
            "cargos": _cell(row, 8),
            "abonos": _cell(row, 9),
            "saldo_final": _cell(row, 10),
            "_source_row_number": idx + 1,
        }
        records.append(record)

    if not records:
        logger.warning(f"No se encontraron transacciones válidas en {filename}")
        logger.warning(f"Total de filas procesadas: {len(raw) - start_idx}")
        return pd.DataFrame(), filename

    df = pd.DataFrame(records)
    logger.info(f"✓ Extraídas {len(df)} transacciones de {filename}")
    return df, filename


def process_files_to_database(
    file_list: List[Tuple[str, BytesIO]],
    usuario: str = "sistema",
    progress_callback: Optional[Callable[[int, str], None]] = None,
    ente_seleccionado: Optional[dict] = None,
    entes_por_archivo: Optional[dict] = None,
):
    """
    Procesa archivos Excel y guarda en base de datos
    Retorna el lote_id para tracking
    """
    def report(p, m, current_file=None):
        if progress_callback:
            progress_callback(p, m, current_file)
        else:
            print(f"[{p}%] {m}")

    lote_id = str(uuid.uuid4())

    # Crear registro de lote
    lote = LoteCarga(
        lote_id=lote_id,
        usuario=usuario,
        archivos=[f[0] for f in file_list],
        tipo_archivo="auxiliar",
        estado='procesando'
    )
    db.session.add(lote)
    db.session.commit()

    try:
        logger.info(f"Iniciando procesamiento de {len(file_list)} archivo(s)")
        report(5, f"Leyendo {len(file_list)} archivo(s)...")
        frames = []
        archivos_procesados = []
        archivos_fallidos = []
        total_files = len(file_list)
        completed_files = 0

        with ThreadPoolExecutor(max_workers=min(4, len(file_list))) as ex:
            futures = {ex.submit(_read_one_excel, f): f for f in file_list}
            for f in as_completed(futures):
                completed_files += 1
                try:
                    df, filename = f.result()
                    if not df.empty:
                        _ensure_balanced_file(df, filename)
                        df['archivo_origen'] = filename
                        frames.append(df)
                        archivos_procesados.append(filename)
                        logger.info(f"Archivo procesado exitosamente: {filename}")
                        progress_pct = 5 + int((completed_files / total_files) * 20)
                        report(progress_pct, f"Archivo procesado: {filename}", filename)
                    else:
                        archivos_fallidos.append(filename)
                        logger.warning(f"Archivo no generó registros: {filename}")
                        progress_pct = 5 + int((completed_files / total_files) * 20)
                        report(progress_pct, f"Archivo sin registros: {filename}", filename)
                except Exception as e:
                    file_info = futures[f]
                    logger.error(
                        f"Error procesando archivo {file_info[0]}: {type(e).__name__} - {str(e)}"
                    )
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    archivos_fallidos.append(file_info[0])
                    progress_pct = 5 + int((completed_files / total_files) * 20)
                    report(progress_pct, f"Error en archivo: {file_info[0]}", file_info[0])
                    continue

        logger.info(
            f"Resumen: {len(archivos_procesados)} exitosos, {len(archivos_fallidos)} fallidos"
        )

        if not frames:
            error_msg = (
                "No se pudo procesar ningún archivo válido. "
                f"Archivos fallidos: {', '.join(archivos_fallidos)}"
            )
            logger.error(error_msg)
            lote.estado = 'error'
            lote.mensaje = error_msg
            db.session.commit()
            raise ValueError(error_msg)

        base = pd.concat(frames, ignore_index=True)

        base["poliza"] = base["poliza"].fillna("").astype(str).str.strip()
        base["beneficiario"] = base["beneficiario"].fillna("").astype(str).str.strip()
        base["no_factura"] = base["no_factura"].fillna("").astype(str).str.strip()
        base["cheque_folio"] = base["cheque_folio"].fillna("").astype(str).str.strip()
        base["descripcion"] = base["descripcion"].fillna("").astype(str).str.strip()
        base["orden_pago"] = base["orden_pago"].fillna("").astype(str).str.strip()
        invalid_op = {"", "n/a", "na", "n.d.", "nd", "none"}
        base["orden_pago"] = base["orden_pago"].where(
            ~base["orden_pago"].str.lower().isin(invalid_op),
            ""
        )

        def _first_non_empty(series):
            for value in series:
                if value:
                    return value
            return ""

        op_por_poliza = base.groupby("poliza")["orden_pago"].apply(_first_non_empty)
        base["orden_pago"] = base["poliza"].map(op_por_poliza).where(
            base["poliza"] != "",
            base["orden_pago"]
        )

        # Dividir cuenta contable en ambos formatos
        report(30, "Procesando cuentas contables...")
        componentes_vertical = base["cuenta_contable"].apply(_split_cuenta_contable_vertical)
        componentes_segmentados = base["cuenta_contable"].apply(_split_cuenta_contable_segmented)
        for key in [
            "genero",
            "grupo",
            "rubro",
            "cuenta",
            "subcuenta",
            "dependencia",
            "unidad_responsable",
            "centro_costo",
            "proyecto_presupuestario",
            "fuente",
            "subfuente",
            "tipo_recurso",
            "partida_presupuestal",
        ]:
            base[key] = componentes_vertical.apply(lambda x: x[key])
        for key in ["cta", "subcta_cog_cri", "clv1", "clv2", "cog", "clv3"]:
            base[key] = componentes_segmentados.apply(lambda x: x[key])

        payload_keys = [
            "ente_clave",
            "ente_codigo",
            "ente_dd",
            "ente_nombre",
            "ente_siglas",
            "ente_ambito",
        ]
        file_ente_payloads = {
            str(filename): _ente_payload_from_selection(payload)
            for filename, payload in (entes_por_archivo or {}).items()
        }

        if file_ente_payloads:
            for key in payload_keys:
                base[key] = base["archivo_origen"].map(
                    lambda name, current_key=key: file_ente_payloads.get(
                        str(name),
                        {},
                    ).get(current_key, "")
                )
        else:
            for key in payload_keys:
                base[key] = ""

        assigned_mask = base["ente_clave"].fillna("").astype(str).str.strip() != ""

        ente_payload = _ente_payload_from_selection(ente_seleccionado)
        if ente_payload["ente_clave"] and not assigned_mask.all():
            for key, value in ente_payload.items():
                base.loc[~assigned_mask, key] = value
            assigned_mask = base["ente_clave"].fillna("").astype(str).str.strip() != ""

        if not assigned_mask.all():
            entes_lookup = _build_entes_lookup(Ente.query.filter_by(activo=True).all())
            entes_resueltos = base.loc[~assigned_mask, "subcta_cog_cri"].apply(
                lambda value: _resolve_ente_catalogo(value, entes_lookup)
            )
            for key in payload_keys:
                base.loc[~assigned_mask, key] = entes_resueltos.apply(
                    lambda x, current_key=key: x[current_key]
                ).values

        # Convertir columnas monetarias
        report(50, "Convirtiendo valores monetarios...")
        base["saldo_inicial"] = _to_numeric_fast(base["saldo_inicial"])
        base["cargos"] = _to_numeric_fast(base["cargos"])
        base["abonos"] = _to_numeric_fast(base["abonos"])
        base["saldo_final"] = _to_numeric_fast(base["saldo_final"])

        # Convertir fechas
        report(65, "Normalizando fechas...")
        base["fecha_transaccion"] = pd.to_datetime(base["fecha"], errors="coerce")

        # Generar hash por registro para evitar duplicados
        report(70, "Generando firmas de registros...")
        base["hash_registro"] = base.apply(_hash_transaccion_row, axis=1)

        total_before_dedupe = len(base)
        base = base.drop_duplicates(subset=["hash_registro"])

        existing_hashes = set()
        hash_list = base["hash_registro"].dropna().unique().tolist()
        for i in range(0, len(hash_list), 900):
            batch = hash_list[i:i + 900]
            existing_hashes.update(
                h for (h,) in db.session.query(Transaccion.hash_registro)
                .filter(Transaccion.hash_registro.in_(batch))
                .all()
            )

        if existing_hashes:
            duplicate_mask = base["hash_registro"].isin(existing_hashes)
            if duplicate_mask.any():
                duplicate_rows = base.loc[duplicate_mask, ["archivo_origen", "hash_registro"]]
                duplicate_counts = (
                    duplicate_rows.groupby("archivo_origen")["hash_registro"]
                    .count()
                    .to_dict()
                )
                file_counts = base.groupby("archivo_origen")["hash_registro"].count().to_dict()
                partial_files = sorted(
                    filename
                    for filename, count in duplicate_counts.items()
                    if count < file_counts.get(filename, 0)
                )
                if partial_files:
                    raise ValueError(
                        "Se detectaron registros previamente cargados en "
                        f"{', '.join(partial_files)}. Se rechaza la carga para evitar resultados parciales."
                    )
            base = base[~base["hash_registro"].isin(existing_hashes)]

        skipped_duplicates = total_before_dedupe - len(base)

        if base.empty:
            lote.total_registros = 0
            lote.estado = 'completado'
            lote.mensaje = "No se insertaron registros nuevos (todos duplicados)."
            db.session.commit()
            report(100, "✅ No se insertaron registros nuevos (todos duplicados).")
            return lote_id, 0

        # Insertar en base de datos en lotes
        report(80, f"Insertando {len(base):,} registros en base de datos...")
        logger.info(f"Iniciando inserción de {len(base)} registros en lotes de {1000}")

        chunk_size = 1000
        total_insertados = 0

        for i in range(0, len(base), chunk_size):
            chunk = base.iloc[i:i + chunk_size]

            transacciones = []
            for _, row in chunk.iterrows():
                trans = Transaccion(
                    lote_id=lote_id,
                    archivo_origen=row['archivo_origen'],
                    usuario_carga=usuario,
                    cuenta_contable=row['cuenta_contable'],
                    nombre_cuenta=row['nombre_cuenta'],
                    cta=row['cta'],
                    subcta_cog_cri=row['subcta_cog_cri'],
                    clv1=row['clv1'],
                    clv2=row['clv2'],
                    cog=row['cog'],
                    clv3=row['clv3'],
                    ente_clave=row['ente_clave'],
                    ente_codigo=row['ente_codigo'],
                    ente_dd=row['ente_dd'],
                    ente_nombre=row['ente_nombre'],
                    ente_siglas=row['ente_siglas'],
                    ente_ambito=row['ente_ambito'],
                    genero=row['genero'],
                    grupo=row['grupo'],
                    rubro=row['rubro'],
                    cuenta=row['cuenta'],
                    subcuenta=row['subcuenta'],
                    dependencia=row['dependencia'],
                    unidad_responsable=row['unidad_responsable'],
                    centro_costo=row['centro_costo'],
                    proyecto_presupuestario=row['proyecto_presupuestario'],
                    fuente=row['fuente'],
                    subfuente=row['subfuente'],
                    tipo_recurso=row['tipo_recurso'],
                    partida_presupuestal=row['partida_presupuestal'],
                    fecha_transaccion=row['fecha_transaccion'],
                    poliza=row['poliza'],
                    beneficiario=row['beneficiario'],
                    no_factura=row['no_factura'],
                    cheque_folio=row['cheque_folio'],
                    descripcion=row['descripcion'],
                    orden_pago=row['orden_pago'],
                    saldo_inicial=row['saldo_inicial'],
                    cargos=row['cargos'],
                    abonos=row['abonos'],
                    saldo_final=row['saldo_final'],
                    hash_registro=row['hash_registro']
                )
                transacciones.append(trans)

            try:
                db.session.bulk_save_objects(transacciones)
                db.session.commit()
                logger.debug(
                    f"Lote {i // chunk_size + 1} insertado correctamente ({len(chunk)} registros)"
                )
            except Exception as e:
                logger.error(
                    f"Error insertando lote {i // chunk_size + 1}: {type(e).__name__} - {str(e)}"
                )
                logger.error(f"Traceback: {traceback.format_exc()}")
                db.session.rollback()
                raise

            total_insertados += len(chunk)
            progress_pct = 80 + int((total_insertados / len(base)) * 15)
            report(progress_pct, f"Insertados {total_insertados:,} de {len(base):,} registros")

        # Actualizar lote
        lote.total_registros = len(base)
        lote.estado = 'completado'
        if skipped_duplicates:
            lote.mensaje = (
                f'Procesados {len(base):,} registros nuevos de {len(archivos_procesados)} archivos '
                f'({skipped_duplicates:,} duplicados omitidos)'
            )
        else:
            lote.mensaje = (
                f'Procesados {len(base):,} registros de {len(archivos_procesados)} archivos'
            )
        db.session.commit()

        report(100, f"✅ Completado: {len(base):,} registros insertados en BD")

        logger.info(f"✓ Procesamiento completado: {len(base)} registros, lote_id={lote_id}")
        return lote_id, len(base)

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"Error fatal en procesamiento: {error_msg}")
        logger.error(f"Traceback completo:\n{traceback.format_exc()}")
        lote.estado = 'error'
        lote.mensaje = error_msg
        db.session.commit()
        raise
