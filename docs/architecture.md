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
- Backend package root: `com.eca.submission`
- Frontend feature root: `frontend/src/features/submission`

Backend components:
- `SubmissionController`
- `SubmissionService`
- `SubmissionStructureValidationService`
- `SubmissionPersistenceService`
- `SubmissionWorkbookParser`
- `SubmissionEntity`
- `SubmissionJpaRepository`

Frontend components:
- `SubmissionWizardPage`
- `UploadIdentifyStep`
- `IdentityResultCard`
- validation summary / issue rendering components
- lightweight review / restart component

Notes:
- Submission is a sibling feature area, not nested under template
- Submission depends on template/version persistence data as the source of truth

---

## Submission Module (Current MVP State)

### Purpose

Handles workbook upload, identity resolution, backend validation, minimal submission persistence, and frontend validation results rendering.

### Current Support

- Slice 1: upload + identify
- Slice 2A: workbook structure validation
- Slice 2B: row / cell validation
- Slice 3: frontend validation UI and results rendering
- Slice 4: UX polish and stability cleanup
- Slice 5: minimal persistence after successful validation

### Current Responsibilities

- Read uploaded Excel workbook
- Extract metadata from `__metadata__`
- Resolve template version using `version_id`
- Compare `schema_hash`
- Validate expected business sheets and headers
- Validate row / cell content against schema field rules
- Persist a minimal validated submission record after successful validation
- Render identify and validation results in the frontend
- Handle validation loading and backend error states in the frontend
- Allow restart / re-upload without workflow state

### Not Yet Supported

- submission list
- approval workflow
- correction UI
- submission lifecycle management
- final submit behavior
- row data storage
- validation result blob storage
