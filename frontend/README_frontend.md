# Frontend Admin App

React + Vite frontend for the current template governance MVP.

## Main Flows

- **Home / Landing** at `/`
- **Template Creation & Export** at `/templates`
- **Data Submission** at `/submissions`
- **Submission History** at `/submissions/history`
- **Submission Details** at `/submissions/:id`

## Run

From [`/frontend`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/frontend):

```bash
npm install
npm run dev
```

Default URL:
- `http://localhost:3000`

## Backend Integration

The frontend calls:
- `POST /api/submissions/identify`
- `POST /api/submissions/validate`
- `GET /api/submissions`
- `GET /api/submissions/{id}`

and the existing template/version endpoints.

## Current Submission UX

- landing page is the app entry point
- submission wizard uses three explicit steps
- Step 1 auto-identifies on file selection
- Step 2 auto-validates when entered and eligible
- Step 3 remains explicit review/restart only
- manual fallback is supported and clearly labeled

## Intentional Limits

- no correction grid
- no approval workflow
- no edit/delete submission actions
- no re-validation from history/details
