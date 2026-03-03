# Template Creation Service

Microservice for **template schema management** and **Excel export**. It does not handle data submission, OCR, or approval workflows. Authentication/authorization is handled externally (Keycloak / API Gateway).

## Prerequisites

- **Java 21**
- **Docker** and **Docker Compose** (for running the app and PostgreSQL together)
- Optional: **Maven 3.9+** and **PostgreSQL 15+** for local run without Docker

## How to Run

### With Docker Compose (recommended)

From the project root:

```bash
docker compose up --build
```

Wait until the app logs show `Started TemplateCreationServiceApplication`. The app waits for Postgres to be healthy before starting.

### Local (without Docker)

1. Start PostgreSQL 15+ and create database `template_db` (user `postgres`, password `postgres`, or match `src/main/resources/application.yml`).
2. Run:

   ```bash
   mvn spring-boot:run
   ```

## Ports and URLs

| Port | Service        | URL |
|------|----------------|-----|
| 8080 | Application    | http://localhost:8080 |
| 5432 | PostgreSQL     | localhost:5432 (internal) |

**Key URLs:**

| Purpose        | URL |
|----------------|-----|
| Swagger UI     | http://localhost:8080/swagger-ui.html |
| API docs (JSON)| http://localhost:8080/api-docs |
| Actuator health | http://localhost:8080/actuator/health |
| Actuator info  | http://localhost:8080/actuator/info |
| Liveness       | http://localhost:8080/actuator/health/liveness |
| Readiness      | http://localhost:8080/actuator/health/readiness |

## Endpoint List

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/templates | List templates (dashboard; each with latestVersion) |
| POST   | /api/templates | Create template + v1 DRAFT |
| GET    | /api/templates/{templateId} | Get template + version summaries |
| POST   | /api/templates/{templateId}/versions | Create new version (clone latest) |
| GET    | /api/versions/{versionId} | Get version + schema_json + schema_hash |
| PUT    | /api/versions/{versionId}/schema | Update schema (latest only; validate, canonicalize, hash) |
| POST   | /api/versions/{versionId}/export | Export XLSX template (streamed attachment) |

All errors return a standard JSON shape: `timestamp`, `status`, `error`, `message`, `path`, `traceId`, and optional `fieldErrors`.

## Curl Samples

Base URL: `http://localhost:8080`. Optional: pass `-H "X-Trace-Id: my-trace-123"` for traceability.

### List templates (dashboard)

```bash
curl -s http://localhost:8080/api/templates
```

Example response (200): array of template summaries, each with `templateId`, `name`, `sectorCode`, `status`, `createdAt`, `createdBy`, and `latestVersion` (object with `versionId`, `versionNumber`, `status`, `createdAt`, `createdBy`, `schemaHash`; or `null` if the template has no versions).

### Create template

```bash
curl -s -X POST http://localhost:8080/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"My Template","sectorCode":"S1","createdBy":"user@example.com"}'
```

Example response (201): `{"templateId":"...","versionId":"...","versionNumber":1}`

### Create version

```bash
curl -s -X POST http://localhost:8080/api/templates/{templateId}/versions \
  -H "Content-Type: application/json" \
  -d '{"createdBy":"user@example.com"}'
```

Replace `{templateId}` with the template UUID. Example response (201): `{"versionId":"...","versionNumber":2}`

### Update schema (latest version only)

```bash
curl -s -X PUT http://localhost:8080/api/versions/{versionId}/schema \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "My Template",
    "sectorCode": "S1",
    "tables": [
      {
        "tableKey": "main",
        "sheetName": "Data",
        "order": 1,
        "fields": [
          { "fieldKey": "name", "headerName": "Name", "type": "TEXT", "required": true },
          { "fieldKey": "status", "headerName": "Status", "type": "TEXT", "validations": { "enum": ["A","B"] } }
        ]
      }
    ]
  }'
```

Replace `{versionId}` with the **latest** version’s UUID. Example response (200): `{"versionId":"...","schemaHash":"..."}`. If the version is not the latest, response is **409 Conflict**.

### Export XLSX

```bash
curl -s -X POST http://localhost:8080/api/versions/{versionId}/export -o MyTemplate_v1.xlsx
```

Replace `{versionId}` with a version UUID. Saves the file as `MyTemplate_v1.xlsx` (or use the filename from the response `Content-Disposition` header).

## Export Demo Steps

1. **Create a template** (curl above). Note `templateId` and `versionId`.
2. **Update the schema** for that `versionId` with at least one table and fields (curl above).
3. **Export**: `curl -s -X POST http://localhost:8080/api/versions/{versionId}/export -o out.xlsx`
4. **Open `out.xlsx`** in Excel or another spreadsheet tool.

**What to expect in the Excel file:**

- **One sheet per table** in your schema, named by `sheetName` (e.g. "Data"). Row 1 contains headers; required fields have a trailing `" *"`.
- **Data validation** where applicable: dropdown for TEXT fields with `validations.enum`; min/max for NUMBER/CURRENCY.
- **Hidden metadata sheet** named `__metadata__`:
  - Contains rows: `template_id`, `version_id`, `version_number`, `schema_hash`, `generated_at` (ISO-8601), `generator_version` (e.g. `template-service/0.1`).
  - This sheet is **very hidden** (not visible in the normal sheet list; can be revealed programmatically or via VBA if needed).

## Error Response Shape

All API errors use the same JSON structure (via `@ControllerAdvice`):

```json
{
  "timestamp": "2025-02-11T12:00:00Z",
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Template not found: ...",
  "path": "/api/templates/...",
  "traceId": "uuid-or-from-X-Trace-Id-header",
  "fieldErrors": []
}
```

- **404** – Resource not found (`NOT_FOUND`).
- **400** – Validation or schema export error (`VALIDATION_ERROR`, `SCHEMA_VALIDATION_ERROR`, `SCHEMA_EXPORT_ERROR`, `INVALID_INPUT`); `fieldErrors` may be present.
- **409** – Version not editable (`VERSION_NOT_EDITABLE`).
- **500** – Generic server error (`INTERNAL_ERROR`); no stack trace in the response.

## Database and Migrations

- **Running the DB:** With `docker compose up`, the `postgres` service starts first. You can run only the DB: `docker compose up postgres -d`, then run the app with `mvn spring-boot:run`.
- **Migrations:** Flyway runs on application startup. Scripts in `src/main/resources/db/migration/` are applied in version order.
- **UUID strategy:** App-generated UUIDs; JPA uses `@GeneratedValue(strategy = GenerationType.UUID)`.

## Architecture Overview

| Layer          | Package                    | Responsibility                                      |
|----------------|----------------------------|-----------------------------------------------------|
| **API**        | `api.controller`, `api.dto` | HTTP only; controllers call use cases; DTOs only   |
| **Application**| `application.usecase`, `application.service` | Use cases orchestrate domain + infrastructure |
| **Domain**     | `domain.model`, `domain.policy`, `domain.exception` | Pure business rules; no Spring/DB/POI        |
| **Infrastructure** | `infrastructure.persistence`, `infrastructure.excel`, `infrastructure.hashing`, `infrastructure.validation` | JPA, POI, hashing, validation |
| **Config**     | `config`                   | OpenAPI, Actuator, request logging, etc.           |

See [ARCHITECTURE.md](ARCHITECTURE.md) for scope, invariants, and rules.

## Project Structure

```
com.eca.template
├── api (controller, dto)
├── application (usecase, service)
├── domain (model, policy, exception)
├── infrastructure (persistence, excel, hashing, validation)
└── config
```
