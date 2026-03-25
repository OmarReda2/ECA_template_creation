# Architecture (v1 — Verified)

## Architecture Style

The system follows a **Layered (N-Tier) Architecture**.

Structure:

Controller → Service → Repository → Database

- Controllers handle HTTP requests and responses
- Services contain business logic
- Repositories use Spring Data JPA
- Entities represent database tables

There is **no strict domain layer separation**.

---

## Modules (Observed)

### Template Module
- TemplateEntity
- TemplateController
- TemplateService
- TemplateRepository

### Template Version Module
- TemplateVersionEntity
- VersionController
- VersionService
- VersionRepository

---

## Data Model (Observed)

### TemplateEntity
Represents template identity:
- id
- name
- sectorCode
- status
- createdAt
- createdBy

### TemplateVersionEntity
Represents version snapshot:
- id
- template (relation)
- versionNumber
- status
- schemaJson (JSONB)
- schemaHash
- createdAt
- createdBy

---

## Key Observations

- Version is created immediately when template is created
- Schema is stored as JSON (JSONB)
- Services directly use repositories (no domain abstraction layer)


---

## Submission Module (New — MVP Slice 1)

### Purpose
Handles workbook upload and identity resolution (no persistence yet).

### Components

- SubmissionController
- SubmissionService
- SubmissionWorkbookParser

### Responsibilities

- Read uploaded Excel workbook
- Extract metadata from `__metadata__` sheet
- Resolve template version using `version_id`
- Compare `schema_hash`
- Return identification result

### Notes

- Slice 1: identify
- Slice 2A: backend structure validation
- no row/cell validation yet
- no persistence

---

## Submission Module (MVP)

Package root:
- `com.eca.submission`

Current components:
- SubmissionController
- SubmissionService
- SubmissionStructureValidationService
- SubmissionWorkbookParser

Notes:
- Submission is a **sibling feature area**, not nested under template
- Submission reuses template/version data as the source of truth
- Submission currently supports:
  - Slice 1: upload + identify
  - Slice 2A: backend workbook structure validation
- Submission does **not** yet support:
  - row / cell validation
  - persistence
  - approval workflow