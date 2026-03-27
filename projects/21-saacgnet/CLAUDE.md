# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAACG.NET is a Flask-based accounting transaction processing system for the State of Tlaxcala. It processes Excel workbooks containing auxiliary accounting records, stores them in a database, and provides a web UI for querying, filtering, and generating reports.

## Commands

```bash
# Setup
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Run locally (port 5021)
python3 run.py

# Syntax check
python3 -m compileall app.py scripts

# Deploy
sudo python3 scripts/autodeploy_all.py --project 24-saacgnet
```

No automated test suite — manual smoke tests using sample files in `example/` (login, upload, dashboard, reports).

## Architecture

**Entry points:**
- `run.py` — simple launcher for development
- `app.py` — Flask app factory (`create_app(config_name)`), all routes live here

**Key modules:**
- `config.py` — `DevelopmentConfig` / `ProductionConfig` loaded from `.env`; port 5021, SQLite dev / PostgreSQL prod, 500 MB upload limit, `.xlsx/.xls/.xlsm` allowed
- `scripts/utils.py` — SQLAlchemy models + Excel processing helpers (`process_files_to_database()`)

**Database models** (all in `scripts/utils.py`):
- `Transaccion` — core accounting rows (40+ columns, indexed by account/date/batch/entity)
- `LoteCarga` — upload batches
- `CargaJob` — background job tracking
- `Usuario` — session-based auth users
- `Ente` — legal entities/departments
- `ReporteGenerado` — generated report metadata

**Auth:** `@app.before_request` enforces session login for all routes except `/login`, `/logout`, `/static`, and `/api/*` endpoints that return 401.

**API surface:**
- `POST /api/process` — main file upload + Excel ingestion pipeline
- `GET /api/transacciones` — paginated transaction query with filters
- `GET /api/transacciones/resumen` — summary statistics
- `POST /api/reportes/generar` — report generation
- CRUD under `/api/entes` for entity management
- Job progress polling at `/api/progress/<job_id>/`

**Frontend:** Jinja2 templates (`templates/`) + vanilla JS (`static/`). No build step.

**Deployment:** systemd + Gunicorn (3 workers, 127.0.0.1:5021) + nginx reverse proxy (`desploy/`). SSL via Let's Encrypt on `saacgnet.omar-xyz.shop`.

## Coding Conventions

- 4-space indentation, snake_case throughout
- Jinja2 template filenames: lowercase with underscores
- Keep route handlers in `app.py` unless a refactor clearly improves separation
- Reference catalogs (`catalogos/*.xlsx`) are source-of-truth for entity/funding-source lookups

## Environment

Required `.env` variables: `FLASK_ENV`, `PORT`, `SECRET_KEY`, `DATABASE_URL`

Runtime directories (`instance/`, `log/`, `logs/`) are machine-specific — do not commit their contents.
