# Copilot / AI assistant instructions for the HRIS repo

This file gives focused, actionable context for AI coding agents to be immediately productive in this repository.

- Architecture (big picture)
  - Monorepo-like layout: a Next.js frontend at the repository root (app/ inside `src`) and an Express backend in `backend/`.
  - Frontend: Next.js (App Router) lives under `src/app` and `src/components`. Key files:
    - `src/lib/api.ts` — central API helper and network/error handling (uses NEXT_PUBLIC_API_URL || http://localhost:5000/api).
    - `src/contexts/AuthContext.tsx` — client-side auth flows, expects `localStorage.token` and redirects to `/login_hr` when unauthenticated.
  - Backend: Express (ESM) under `backend/src` with clear separation: `controllers/`, `routes/`, `middleware/`, `config/` and `utils/`.
    - Entry points: `backend/src/app.js` (Express app) and `backend/src/server.js` (starts server and tests DB connection).
    - Uses JWT auth — routes protected with `verifyToken` middleware. See `backend/src/routes/auth.js` and `controllers/authController.js`.

- Important integration points
  - Frontend <-> Backend: frontend expects backend API at NEXT_PUBLIC_API_URL (default http://localhost:5000/api). The frontend `apiCall` wraps responses that often use the `{ success, data, message }` envelope.
  - Authentication: token stored in `localStorage` under key `token`. `apiCall` attaches `Authorization: Bearer <token>` automatically.
  - Fingerprint/Hardware: backend includes `serialport` and a fingerprint bridge script `backend/src/scripts/startFingerprintBridge.js` — treat hardware flows as separate processes connecting to backend endpoints (`/api/fingerprint`).
  - Docker: a `docker-compose.yml` exists at repo root for integrated local deployment — check env values before running.

- Developer workflows / commands (PowerShell examples)
  - Frontend (Next.js):
    - Dev: `npm run dev` (from repo root) — opens at http://localhost:3000
    - Build: `npm run build` then `npm start` for production build
  - Backend (Express):
    - Install and run:
      - cd into `backend/`
      - Copy env: `cp .env.example .env` (or copy manually on Windows)
      - `npm install`
      - Dev: `npm run dev` (nodemon src/server.js) — default port 5000
      - Start fingerprint bridge (if testing hardware): `npm run fingerprint` in `backend/`
  - Full stack with Docker Compose: inspect `docker-compose.yml`, set env values, then `docker compose up --build`.

- Project-specific patterns & conventions (do not assume generic defaults)
  - API envelope: many backend endpoints return an object with `success`, `data`, `message`. The frontend `apiCall` checks for a `success` field — prefer returning that envelope when changing backend responses.
  - Error handling: `apiCall` performs redirects on 401 and will remove `localStorage.token` — do not implement automatic token deletion on 500-level errors.
  - Retry policy: GET requests get a couple retries on transient 502/503/504; non-GETs are not retried by default.
  - Timeouts: `apiCall` uses a default timeout (20s) and shows friendly messages — follow existing friendly messages and avoid surfacing raw stack traces to the UI.
  - Frontend storage: token in `localStorage`; ephemeral session data may be in `sessionStorage` — AuthContext clears both on logout.
  - Next.js settings: `next.config.ts` disables ESLint during build (safe for demo); respect the app router conventions (`src/app`) and `use client` boundaries in components like `AuthProvider`.

- Files to read for concrete examples
  - `backend/README.md` — backend overview and endpoint reference
  - `backend/src/app.js` and `backend/src/server.js` — middleware, routes and server lifecycle
  - `src/lib/api.ts` — API helper, auth header, retry and timeout rules
  - `src/contexts/AuthContext.tsx` — client auth flow and redirects
  - `docker-compose.yml` — how services are composed for local deployment

- Quick guidance for code changes
  - When changing an API route, update both backend controller and any frontend callers in `src/lib/api.ts` or pages/components that call it.
  - Preserve the `{ success, data, message }` envelope shape where used; if not possible, update `apiCall` to handle the new shape explicitly.
  - For auth changes, update `backend/src/middleware/auth.js`, `backend/src/routes/auth.js`, and `src/contexts/AuthContext.tsx` together.

- When you need more context or access
  - Ask for the `.env` values (do NOT request secrets directly). If you need a reproducible local environment, request a sanitized `.env.example` mapping and confirm which services to spin up (frontend, backend, fingerprint bridge).

If any section is unclear or you want me to expand with concrete code examples (e.g., how to add a new protected route and call it from the UI), tell me which area to expand and I will update this file.
