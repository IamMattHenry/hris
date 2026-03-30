# Copilot instructions for HRIS

## Architecture snapshot
- Monorepo split: Next.js frontend at repo root (`src/app`, `src/components`, `src/lib`) and Express backend in `backend/src`.
- Backend entrypoints: `backend/src/app.js` (middleware + route wiring) and `backend/src/server.js` (DB check, startup, scheduled leave-revert job).
- Backend is ESM (`"type": "module"` in `backend/package.json`); use `import/export`, not CommonJS.
- Data access is centralized in `backend/src/config/db.js` with pool helpers plus transaction-aware helpers (`beginTransaction`, `transactionQuery`, `commit`, `rollback`) via AsyncLocalStorage.
- Frontend API boundary is `src/lib/api.ts`; most UI code should call exported API objects there, not raw `fetch`.

## Integration points that matter
- Frontend calls `${NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}` from `src/lib/api.ts`.
- Auth token is stored in `localStorage` key `token`; `apiCall` auto-attaches `Authorization: Bearer <token>`.
- `AuthProvider` in `src/contexts/AuthContext.tsx` redirects to `/login_hr` when unauthenticated and clears storage on logout.
- Fingerprint flows run as a separate process via `backend/src/scripts/startFingerprintBridge.js` (`npm run fingerprint`) and bridge to backend `/api/attendance/fingerprint`.

## Response/error conventions
- Prefer backend JSON envelope shape: `{ success, message, data? }` (see routes/controllers and `src/lib/api.ts` pass-through behavior).
- Frontend `apiCall` behavior is opinionated:
  - 401: removes `localStorage.token` and redirects.
  - 500: returns friendly message; does **not** auto-logout.
  - GET retries only on 502/503/504 (2 retries), default timeout is 20s.
- Backend global error format comes from `backend/src/middleware/errorHandler.js`; use `next(error)` for unexpected controller errors.

## Auth + RBAC patterns
- Backend protection layers are combined: `verifyToken` + permission middleware (`requirePermission`) in route files like `backend/src/routes/employees.js`.
- Frontend permission checks use `src/hooks/usePermissions.ts` (`can`, `canAny`, `canAll`, `hasRole`) with module-level caching.
- For auth/RBAC changes, update both backend guards (`backend/src/middleware/auth.js`, `backend/src/middleware/rbac.js`, route middleware usage) and frontend gating (`AuthProvider`, `usePermissions`, affected pages).

## Developer workflows (Windows-friendly)
- Frontend dev (repo root): `npm install`, then `npm run dev` (Next.js on 3000).
- Backend dev (`backend/`): `npm install`, copy `.env.example` to `.env`, then `npm run dev` (Express on 5000).
- Backend tests (`backend/`): `npm test` (uses `node --experimental-vm-modules` for Jest ESM support).
- Fingerprint bridge (`backend/`): `npm run fingerprint` (needs correct `FINGERPRINT_PORT`, default `COM13`).
- SQL migrations (`backend/`): `node scripts/runMigration.js <file.sql>` (runs from `backend/migrations`).

## High-value file anchors
- API client + network policy: `src/lib/api.ts`
- Client auth/session behavior: `src/contexts/AuthContext.tsx`
- Route wiring: `backend/src/app.js`
- Transaction/data helpers: `backend/src/config/db.js`
- Permission-guarded route example: `backend/src/routes/employees.js`
- Budget enforcement example in employee lifecycle: `backend/src/controllers/employeeController.js` + `backend/src/services/financeBudgetService.js`

## Change guidance for agents
- When adding/changing an endpoint, update **all three**: route registration, controller logic, and frontend API wrapper usage.
- Keep envelope compatibility unless intentionally migrating callers; if response shape changes, adjust `src/lib/api.ts` consumers in same task.
- Preserve existing timezone/data-write behavior in `db.js` (`undefined` -> `null`, Manila date formatting).
