# Backend Service

Spring Boot backend for the current MVP.

## What It Does

### Template Creation & Export
- create templates
- create versions
- edit latest-version schema
- export Excel workbooks with embedded metadata

### Submission
- identify uploaded workbooks from metadata
- validate workbook structure and row/cell content
- support explicit manual fallback validation against the latest template version
- persist a minimal validated submission record
- expose read-only submission history and details

## Run

Prerequisites:
- Java 21
- PostgreSQL

From [`/backend`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/backend):

```bash
mvn spring-boot:run
```

Default URL:
- `http://localhost:8080`

## Database / Migrations

Flyway runs on startup.

Current migrations:
- `V1__skeleton_tables.sql`
- `V2__create_templates_and_template_versions.sql`
- `V3__create_submissions.sql`

## Current API Surface

### Templates
- `GET /api/templates`
- `POST /api/templates`
- `GET /api/templates/{templateId}`
- `POST /api/templates/{templateId}/versions`
- `GET /api/versions/{versionId}`
- `PUT /api/versions/{versionId}/schema`
- `POST /api/versions/{versionId}/export`

### Submissions
- `POST /api/submissions/identify`
- `POST /api/submissions/validate`
- `GET /api/submissions`
- `GET /api/submissions/{id}`

## Current Submission Rules

- automatic validation uses resolved workbook metadata
- manual fallback is explicit only
- manual fallback uses the latest version of the selected template only
- persistence happens only after validation completes with no blocking errors
- saved submissions contain metadata only, not row data or validation blobs

## Intentional Limitations

- no approval workflow
- no correction/edit UI
- no row-data persistence
- no validation blob storage
- no re-validation from saved submissions

See:
- [`ARCHITECTURE.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/backend/ARCHITECTURE.md)
- [`../docs/architecture.md`](E:/SWE-work/Bassirah/ECA/eca_projects/template-creation-service-main/docs/architecture.md)
