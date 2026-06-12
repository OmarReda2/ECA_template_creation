# Template Governance MVP

This repository contains a modular-monolith MVP for two connected workflows:

- **Template Creation & Export**
- **Data Submission**

The system supports governed template/version management, Excel export with embedded metadata, workbook identification, validation, minimal submission persistence, and read-only submission history/details.

## Current MVP Scope

### Template Creation & Export
- create templates
- create new template versions
- edit the latest version schema
- export versioned Excel workbooks

### Data Submission
- upload workbook
- auto-identify workbook metadata
- validate workbook structure and row/cell content
- use explicit manual fallback validation against the **latest version** of a selected template
- persist a minimal validated submission record
- view read-only submission history
- view read-only submission details

## Not Implemented

- approval workflow
- correction/edit grid
- row-data persistence
- validation blob storage
- manual version selection for fallback
- re-validation from history/details
- delete/edit submission actions

## Run Locally

### Backend

Prerequisites:
- Java 21
- PostgreSQL

Run from [`/backend`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/backend):

```bash
mvn spring-boot:run
```

Default backend URL:
- `http://localhost:8080`

Database migrations:
- Flyway runs on startup
- current migrations:
  - `V1__skeleton_tables.sql`
  - `V2__create_templates_and_template_versions.sql`
  - `V3__create_submissions.sql`

### Frontend

Prerequisites:
- Node.js 18+

Run from [`/frontend`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/frontend):

```bash
npm install
npm run dev
```

Default frontend URL:
- `http://localhost:3000`

## Major Routes

- `/` — landing page
- `/templates` — template list
- `/templates/create` — template creation flow
- `/submissions` — submission wizard
- `/submissions/history` — read-only submission history
- `/submissions/:id` — read-only submission details

## Current Submission Endpoints

- `POST /api/submissions/identify`
- `POST /api/submissions/validate`
- `GET /api/submissions`
- `GET /api/submissions/{id}`

## Notes

- Workbook identification is metadata-driven
- `version_id` is the primary automatic resolver
- `schema_hash` is used as the required automatic match check
- manual fallback is explicit and uses the latest version of the selected template only
- successful validation persists a minimal `SubmissionEntity` and returns `submissionId`

## Source of Truth

- [`docs/architecture.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/docs/architecture.md)
- [`docs/constraints.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/docs/constraints.md)
- [`docs/flows.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/docs/flows.md)
- [`docs/gaps.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/docs/gaps.md)
- [`specs/submission-module-spec-v2.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/specs/submission-module-spec-v2.md)
