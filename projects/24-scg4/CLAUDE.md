# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SCG4 — a Flask web application scaffold. Port: **5011**.

## Setup & Commands

```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run (development)
python3 run.py

# Deploy (from portfolio root)
sudo python3 scripts/autodeploy_all.py --project 24-scg4
```

Create `.env` for local config:
```
FLASK_ENV=development
PORT=5011
```

## Architecture

- `app.py` — Flask app factory (`create_app`); `run.py` — entry point
- `config.py` — DevelopmentConfig / ProductionConfig (port 5011, SQLite)
- `scripts/utils.py` — SQLAlchemy models + TXT file parser
- `templates/` — base.html, index.html (upload+dashboard), login.html, catalogo_entes.html
- `static/css/style.css` — frontend styles (cloned from 21-saacgnet)
- `example/` — sample TXT files (format: `R1-L1-M12_{CODIGO}.TXT`)
- `desploy/` — systemd service + nginx config for `scg4.omar-xyz.shop`
- `instance/scg4.db` — SQLite database (auto-created)

## TXT File Format

Files must follow the pattern `R1-L1-M{mes}_{codigo}.TXT` (e.g. `R1-L1-M12_101.TXT`).
Entity code in filename must be in the catalog (101, 102, 103, 104, 105, 106, 107, 110, 116, 149, 152, 153, 157).

## Key Endpoints

- `GET /` — upload + dashboard
- `GET /catalogo-entes` — entity catalog
- `POST /api/process` — upload TXT files (multipart: `archivo`, `periodo_ano`)
- `GET /api/progress/<job_id>` — SSE progress stream
- `GET /api/transacciones` — paginated transactions (filters: cuenta_contable, ente_nombre, fecha_inicio, fecha_fin, poliza, beneficiario)
- `GET /api/dashboard/stats` — aggregate stats
- `GET /api/entes` — entity catalog (from memory, not DB)
- `POST /api/process-example` — process files from `example/` folder

## Default credentials

User: `admin` / Password: `admin1234` (change in production via SECRET_KEY env var)
