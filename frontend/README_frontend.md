# Template Creation Admin (Frontend)

React 18 + Vite + TypeScript admin console for the Template Creation Service. Auth is handled externally (e.g. Keycloak); this app does not implement login or user management.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** (or yarn/pnpm)

## Run the app

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at **http://localhost:3000** (configurable via Vite).

## Configure API base URL / proxy

The frontend talks to the Spring Boot backend. Two options:

### 1. Vite proxy (recommended for local dev)

You can use the **Vite proxy option** so that all requests to `/api` from the browser go to the dev server, and Vite forwards them to the backend. This avoids CORS in development.

In **`vite.config.ts`** the proxy is configured as:

```ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
      changeOrigin: true,
    },
  },
},
```

- With no env set, `/api` is proxied to `http://localhost:8080`.
- The axios instance in `src/shared/lib/http.ts` uses `VITE_API_BASE_URL` as `baseURL`. For proxy usage, leave it unset (empty) so requests are same-origin (`/api/...`) and Vite forwards them.

To point the proxy at another backend:

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

Or copy `.env.example` to `.env` and set:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 2. Direct API URL (no proxy)

If you run the app against a backend on another origin (e.g. deployed API), set **`VITE_API_BASE_URL`** to that base URL. The axios instance in `src/shared/lib/http.ts` uses it:

```ts
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
```

- **Empty** (default when unset): same-origin requests; use with the Vite proxy so `/api` is same-origin and proxy forwards.
- **Set to e.g. `https://api.example.com`**: all API requests go to that origin. Ensure the backend allows CORS for your frontend origin.

## Auth (token passthrough)

The app does not implement login. If the backend expects a Bearer token, you can pass it through by storing it in `localStorage` under the key **`access_token`**. The axios instance in `src/shared/lib/http.ts` will attach `Authorization: Bearer <token>` to every request when that key is set. (e.g. after an external auth flow writes the token.)

## Error handling

Backend errors are normalized to a **`FrontendError`** type in `src/shared/errors/errorTypes.ts`. Use **`normalizeError(raw)`** to map backend `ErrorResponse` (or any thrown value) to `{ message, status, path, traceId, errorCode, fieldErrors }`. **`getErrorMessage(e, includeFieldErrors)`** returns a single display string.

## Toast system

A simple toast system is provided in `src/shared/ui/Toast.tsx`. The app is wrapped with **`ToastProvider`**; any component can call **`useToast()`** and then **`showToast(message, variant?)`** with variant `'info' | 'success' | 'error'`. Toasts auto-dismiss after a few seconds and can be dismissed manually.

## CORS

When using the **Vite proxy**, the browser only sees the dev server origin; the backend receives proxied requests from the server, so CORS is not an issue for local dev.

When using **direct API URL** (different origin), the backend must allow the frontend origin in CORS (e.g. Spring Boot CORS config or API Gateway).

## Scripts

| Command       | Description                |
|---------------|----------------------------|
| `npm run dev` | Start dev server           |
| `npm run build` | Production build         |
| `npm run preview` | Preview production build |

## Folder structure

```
src/
  app/           App root, router, layout (AppShell, Sidebar, Topbar)
  features/      templates, versions, schema, export (api, types, pages, components)
  shared/        ui (Button, Modal, Badge, Table, Toast, EmptyState, Spinner)
                 lib (http, download, format)
                 errors (ErrorPanel, errorTypes)
  main.tsx
  index.css
```

## Tech stack

- Vite 5, React 18, TypeScript
- React Router 6
- Axios
- Tailwind CSS 3
