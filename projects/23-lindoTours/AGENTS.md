# Repository Guidelines

## Project Structure & Module Organization
`server.js` is the single Express backend, SQLite bootstrap, and SPA entrypoint; it also serves `public/index.html` for catch-all routes. UI assets live in `public/`: styles in `public/css/`, browser logic in `public/js/`, and tour/testimonial images in `public/imagenes/`. Database schema and seed data live in `db/schema.sql` and `db/seed.sql`; tracked `db/*.db-*` files are runtime artifacts, not sources of truth. Smoke tests and helper scripts live in `scripts/`. Deployment templates are under `desploy/` and should keep that folder name.

## Build, Test, and Development Commands
`npm install` installs the runtime dependencies. `npm start` launches the app locally on `PORT` or `3000`. `npm test` or `npm run smoke` runs the full smoke suite against a temporary database and storage directory. Use targeted flows while debugging: `npm run smoke:orders`, `npm run smoke:customer-auth`, `npm run smoke:bank-transfer`, `npm run smoke:admin`, and `npm run smoke:paypal`. For iterative backend work, `node --watch server.js` mirrors the production `systemd` setup described in `desploy/README.md`.

## Coding Style & Naming Conventions
Follow the existing JavaScript style: CommonJS modules, semicolons, single quotes, and 4-space indentation in source files. Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for env-backed constants, and descriptive helper names such as `computePaymentBreakdown`. Keep new asset folders lowercase and slug-like, for example `public/imagenes/servicios/private_chichen_itza_cenote_with_lunch/`. No formatter or linter is configured, so match surrounding code and keep diffs tight.

## Testing Guidelines
This project uses the custom Node smoke runner in `scripts/smoke.js`, not Jest or Vitest. Extend the nearest smoke scenario when changing checkout, customer auth, admin, or PayPal/bank transfer behavior. Run the narrowest relevant smoke command first, then `npm test` before handing work off. There is no enforced coverage threshold, so regression coverage depends on scenario updates.

## Commit & Pull Request Guidelines
Recent history is mixed (`fix: ...`, `feat: ...`, and very short subjects all appear). For new commits, prefer short imperative summaries with optional prefixes, for example `fix: validate transfer proof amount`. PRs should summarize user-visible impact, note schema or env changes, link the issue when available, and include screenshots for `public/` UI changes.

## Security & Configuration Tips
Start from `desploy/lindo-tours.env.example`. Never commit real credentials, PayPal secrets, SQLite database files, WAL files, or private uploads. In production, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` explicitly and keep `SQLITE_DB_PATH` plus `PRIVATE_STORAGE_PATH` outside the repository.
