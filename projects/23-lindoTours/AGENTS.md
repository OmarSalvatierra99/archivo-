# Repository Guidelines

## Project Structure & Module Organization
`server.js` contains the Express app, SQLite initialization, API routes, and static file serving. Frontend files live in `public/`: `index.html`, `css/styles.css`, `js/main.js`, `js/hotels.js`, and image assets under `public/imagenes/`. Database sources live in `db/schema.sql` and `db/seed.sql`; treat `db/*.db` and `storage/` as local runtime state, not source files. Integration smoke coverage is implemented in `scripts/smoke.js`.

## Build, Test, and Development Commands
`npm install` installs dependencies.
`npm start` runs the site and API on `http://localhost:3000`.
`PORT=4000 npm start` starts the same server on another port.
`npm test` or `npm run smoke` runs the full smoke suite against a temporary SQLite database.
`npm run smoke:admin`, `npm run smoke:paypal`, `npm run smoke:bank-transfer`, and similar scripts run one flow at a time while iterating.

## Coding Style & Naming Conventions
Backend code uses CommonJS Node.js; frontend code is vanilla HTML, CSS, and JavaScript. Follow the existing style: 4-space indentation in JS, 2-space indentation in CSS, and semicolons in JS files. Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for shared constants, and `snake_case` for service folders such as `public/imagenes/servicios/chichen_itza_group_tour/`. Keep bilingual content paired consistently as `*_en` and `*_es`. No formatter or linter is committed, so match surrounding code and keep diffs minimal.

## Testing Guidelines
Smoke tests use Node’s built-in `assert` and boot the real server with isolated temp storage. When adding coverage, extend `scripts/smoke.js` with a `run<Area>Scenario` function, register it in `scenarios`, and add an `npm` script if the flow will be reused. Before a PR, run the relevant smoke command and manually verify changed UI in both languages plus a mobile-sized viewport.

## Commit & Pull Request Guidelines
Recent history mixes informal commits with prefixes like `feat:` and `fix:`. Prefer `<type>: <imperative summary>`, for example `fix: validate transfer proof uploads`. Keep commits focused on one concern. Pull requests should summarize behavior changes, list commands run, mention schema or env changes, and include screenshots for visible `public/` updates.

## Security & Configuration Tips
Copy values from `.env.example` for local setup. Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD`, PayPal credentials, and bank-transfer fields before testing secured flows. Do not rely on fallback development credentials outside local work, and never commit `.env`, SQLite database files, or uploaded proof documents.
