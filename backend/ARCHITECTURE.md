# Template Creation Service — Architecture

## Scope

This microservice is **only** responsible for:

- **Template schema management**: create templates, create versions, update schema (validate, canonicalize, hash, persist).
- **Excel export**: generate and stream Excel workbooks derived from stored template schemas.

**Out of scope:**

- Data submission / ingestion / OCR.
- Approval workflow.
- Login, user management, or identity provisioning. Authentication and authorization are handled externally (Keycloak / API Gateway). This service may read user info from request headers/claims for auditing only.

---

## Layer Responsibilities

### 1. API layer (`api.controller`, `api.dto`)

- **Controllers**: Handle HTTP only. Call application/use-case classes. No business logic, no Excel logic, no repository or JPA access.
- **DTOs**: Request/response models for the API. Must not be JPA entities. Use Bean Validation (`@Valid`) for basic request validation; business invariants stay in domain/application.

### 2. Application layer (`application.usecase`, `application.service`)

- **Use cases**: Orchestrate flows such as CreateTemplate, CreateVersion, UpdateSchema, ExportExcel.
- **Services**: Coordinate domain policies, repositories (via ports or interfaces), and infrastructure (Excel builder, hasher, validator).
- Application layer may call domain and infrastructure; it does not contain HTTP or persistence details.

### 3. Domain layer (`domain.model`, `domain.policy`, `domain.exception`)

- **Models**: Pure Java (e.g. `Template`, `TemplateVersion`). No Spring, JPA, Apache POI, or web dependencies.
- **Policies**: Business rules (e.g. only latest version editable; schema invariants like unique keys).
- **Exceptions**: Domain exceptions for business rule violations.
- Domain must not depend on infrastructure or framework.

### 4. Infrastructure layer (`infrastructure.persistence`, `infrastructure.excel`, `infrastructure.hashing`, `infrastructure.validation`)

- **Persistence**: JPA entities, repositories, mappers (entity ↔ domain).
- **Excel**: All Apache POI (SXSSF) code. Build workbooks from schema; called by application layer.
- **Hashing**: JSON canonicalization and content hashing for schema versioning.
- **Validation**: Schema structure/format validation; business invariants remain in domain.

### 5. Config (`config`)

- Spring configuration: OpenAPI/Swagger, Actuator, and any security/audit placeholders.

---

## Key Invariants

- **Editability**: Only the latest version of a template is editable. Older versions are immutable.
- **Excel is derived**: Excel export is always generated from the stored schema; no separate Excel storage. Schema is the single source of truth.
- **No POI in controllers or domain**: All Apache POI usage is confined to `infrastructure.excel`.
- **No JPA in API**: Controllers and DTOs never expose or use JPA entities directly.

---

## Cross-Cutting

- **Error handling**: `@RestControllerAdvice` (`GlobalExceptionHandler`) returns consistent `ErrorResponse` (code, message, timestamp, path, optional field errors).
- **Validation**: Bean Validation on DTOs for basic checks; business rules and schema invariants in domain/application.
- **Health**: Actuator health endpoint (e.g. `/actuator/health`).
- **Docs**: Swagger UI via springdoc-openapi (e.g. `/swagger-ui.html`, `/api-docs`).

---

## Tech Stack

- Java 21, Spring Boot 3.x
- PostgreSQL 15+, JSONB for schema storage
- Flyway for migrations
- Apache POI (SXSSF) for Excel export
- springdoc-openapi for OpenAPI/Swagger UI
- Actuator for health/info
- Docker + docker-compose for local run (placeholder in README)
