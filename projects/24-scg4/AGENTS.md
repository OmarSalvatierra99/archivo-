# Repository Guidelines

## Project Structure & Module Organization
- `app.py` is the Flask entry point; keep routes, helpers, and simple decorators there unless a refactor is needed.
- `run.py` mirrors the production startup script and loads the same app context for local launches.
- `templates/`, `static/`, and `projects/` hold the UI assets, CSS/JS/images, and per-project Markdown used in the portfolio.
- `scripts/` hosts automation helpers invoked via `main.py` (clean, sync, scaffolding, deployment hooks).
- `instance/`, `log/`, and `logs/` are runtime artifacts and should remain out of source control.
- Manage dependencies through `requirements.txt`; stay within the `venv` created at the repo root.

## Build, Test, and Development Commands
- `python3 -m venv venv` then `source venv/bin/activate`: create/enter the virtualenv before installing packages.
- `pip install -r requirements.txt`: install the Flask stack referenced by `app.py` and CLI scripts.
- `python3 app.py`: start the Flask server on `0.0.0.0:5000` (override `PORT` via env vars).
- `python3 run.py`: the primary local entry point used in README walkthroughs; mirrors production config.
- `python3 main.py --help` and `python3 main.py clean --dry-run`: inspect and exercise the maintenance scripts.
- `python3 scripts/autodeploy_all.py --project 24-scg4`: deploy shortcut referenced in README (requires sudo per existing docs).

## Coding Style & Naming Conventions
- Use 4-space indentation, no tabs, and snake_case for functions/variables (consistent with the existing Python files).
- Template filenames stay lowercase with underscores (e.g., `project_detail.html`), and static assets follow descriptive names such as `style.css`.
- Keep Flask-specific helpers within `app.py` unless a module extract is clearly justified.
- Avoid global secrets in source; use `.env` keys shown in README (`FLASK_ENV`, `PORT`).

## Testing Guidelines
- No automated test suite is present; mention in PRs that tests were not run if none were added.
- For manual verification, follow the README commands (activate `venv`, run `python3 run.py`, exercise the UI), and note any UI/test hints sourced from project READMEs.

## Commit & Pull Request Guidelines
- Follow the recent history: use imperative summaries (e.g., "Improve portfolio layout") or auto-sync timestamps like `Auto-sync: 2026-01-05 19:06:33`.
- PR summaries should include a brief description, testing status (or "not run"), and screenshots for UI changes.
- Link issues/context when available and keep commits focused on a single change when possible.

## Security & Configuration Tips
- Never commit `.env` or secrets; document required variables in README/instances instead.
- Store runtime logs in `log/`/`logs/` and ensure they are ignored by Git.
- Use `PORT` and `FLASK_ENV` to control environments rather than hardcoding values in `app.py` or `run.py`.
