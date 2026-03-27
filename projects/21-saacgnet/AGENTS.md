# Repository Guidelines

## Project Structure & Module Organization
`app.py` contains the Flask app factory, routes, authentication checks, report endpoints, and startup logging. Use `run.py` as the simplest local entry point. `config.py` loads environment variables and selects Flask and database settings. `scripts/utils.py` holds the SQLAlchemy models plus spreadsheet-processing helpers used by the app.

UI files live in `templates/` and static assets are split into `static/css/`, `static/js/`, and `static/img/`. Source workbooks used by the system live in `catalogos/`, while `example/` contains sample input and output files. Runtime data is created under `instance/`, `log/`, and `logs/`. Deployment files are kept in `desploy/`.

## Build, Test, and Development Commands
Set up a local environment with:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Run the app locally with `python3 run.py` or `python3 app.py`. The default port is `5021`; override it with `PORT` in `.env`.

Use `python3 -m compileall app.py scripts` for a quick syntax check before committing. If you are validating spreadsheet flows, test with the sample files in `example/`.

## Coding Style & Naming Conventions
Use 4-space indentation and keep Python names in `snake_case`. Follow the existing pattern of keeping route handlers and request helpers in `app.py` unless a refactor clearly improves separation. Keep Jinja templates lowercase with underscores, and give static files descriptive names such as `style.css` or `main.js`.

## Testing Guidelines
There is no automated test suite in this repository yet. At minimum, run the compile check and perform a manual smoke test of login, dashboard, uploads, and report downloads against a local database. When fixing import logic, verify behavior with representative `.xlsx` files from `example/` or `catalogos/`.

## Commit & Pull Request Guidelines
Recent history shows a mix of descriptive commits (`Improve portfolio: ...`, `Update gitignore ...`) and timestamped sync commits (`Auto-sync: YYYY-MM-DD HH:MM:SS`). Prefer short, imperative summaries for normal work; reserve the auto-sync format for sync jobs only.

PRs should include a concise summary, manual test notes, any environment or database assumptions, and screenshots for template or CSS changes.

## Security & Configuration Notes
Do not commit real credentials. Keep `SECRET_KEY`, `DATABASE_URL`, and `PORT` in `.env`. Treat files under `instance/`, `log/`, `logs/`, and local virtual environments as machine-specific artifacts unless a change explicitly belongs in version control.
