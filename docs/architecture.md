# Architecture (v1 - Verified)

## Architecture Style

The system follows a **Layered (N-Tier) Architecture**.

Structure:

Controller -> Service -> Repository -> Database

- Controllers handle HTTP requests and responses
- Services contain business logic
- Repositories use Spring Data JPA
- Entities represent database tables

There is no strict domain layer separation.

---

## Modules (Observed)

### Template Module
- `TemplateEntity`
- `TemplateController`
- `TemplateService`
- `TemplateRepository`

### Template Version Module
- `TemplateVersionEntity`
- `VersionController`
- `VersionService`
- `VersionRepository`

### Submission Module
- `SubmissionController`
- `SubmissionService`
- `SubmissionStructureValidationService`
- `SubmissionWorkbookParser`

Submission package root:
- `com.eca.submission`

Notes:
- Submission is a sibling feature area, not nested under template
- Submission depends on template/version persistence data as the source of truth

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

## Submission Module (Current MVP State)

### Purpose

Handles workbook upload, identity resolution, and backend validation against the resolved schema.

### Current Support

- Slice 1: upload + identify
- Slice 2A: workbook structure validation
- Slice 2B: row / cell validation

### Current Responsibilities

- Read uploaded Excel workbook
- Extract metadata from `__metadata__`
- Resolve template version using `version_id`
- Compare `schema_hash`
- Validate expected business sheets and headers
- Validate row / cell content against schema field rules
- Return compact validation reports

### Not Yet Supported

- persistence
- approval workflow
- correction UI
- submission lifecycle management
