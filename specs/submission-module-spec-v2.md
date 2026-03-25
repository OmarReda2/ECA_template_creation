# Submission Module Spec (MVP - Updated and Aligned)

## 1. Purpose

Build the **Submission** module as the next capability of the existing system.

This module allows a user to:

1. upload a filled Excel workbook
2. read workbook metadata
3. identify the intended template/version
4. validate workbook structure and row/cell content against the resolved schema
5. persist a minimal validated submission record when validation succeeds
6. view saved submissions in a read-only history screen
7. review validation results and re-upload when needed

---

## 2. Current Implementation Status

- Slice 1 (Upload and Identify Template) is implemented
- Slice 2A (Backend Workbook Structure Validation) is implemented
- Slice 2B (Backend Row / Cell Validation) is implemented
- Slice 3 (Frontend Validation UI and Results Rendering) is implemented
- Slice 4 (UX Polish, Stability, and Cleanup) is implemented
- Slice 5 (Minimal submission persistence) is implemented
- Slice 6 (Read-only submission history) is implemented

This document includes both:
- implemented behavior (Slices 1 through 6)
- planned behavior (future slices)

---

## 3. Application Entry (Landing Page)

The application includes a simple landing page as the entry point.

User can choose between:
- **Template Creation and Export**
- **Data Submission**

Navigation behavior:
- `Create Template` -> Template Creation Flow
- `Submit Data` -> Submission Flow

Rules:
- landing page is not a business feature
- no authentication logic yet
- must remain minimal and neutral

---

## 4. Architecture Constraints

### Backend

- modular monolith
- layered / n-tier architecture
- submission is a separate module
- reuse Template + Version as source of truth
- no forced shared module

### Frontend

- extend existing structure
- keep submission UI inside the current app
- reuse current UI patterns
- keep state local to the submission feature

### General

Prefer:
- minimal changes
- small commits

Avoid:
- microservices
- CQRS
- workflow engines
- broad refactors

---

## 5. Existing System Assumptions

System already supports:
- template creation
- versioning
- Excel export
- metadata sheet (`__metadata__`)
- schema hash

Submission must reuse:
- Template identity
- Version identity
- Schema JSON
- Schema hash

---

## 6. MVP Scope

### In Scope (Implemented so far)

#### Slice 1
- upload Excel workbook
- read `__metadata__`
- extract:
  - `template_id`
  - `version_id`
  - `version_number`
  - `schema_hash`
- resolve template version using `version_id`
- compare schema hash
- return identification result
- landing page routing

#### Slice 2A
- validate workbook structure only
- require `EXACT_MATCH` before validation proceeds
- ignore `__metadata__`, `_validation`, and `Instructions` as business sheets
- check expected business sheets against schema tables
- check expected headers against schema fields
- report extra sheets and extra headers as warnings
- return compact validation report

#### Slice 2B
- extend backend validation to row / cell content
- validate required fields
- validate supported types:
  - TEXT
  - NUMBER
  - DATE
  - BOOLEAN
  - CURRENCY
- validate enum rules
- validate min/max rules where schema supports them
- report row-level issues with sheet/row/header location

#### Slice 3
- frontend upload + identify flow
- frontend validation trigger after `EXACT_MATCH`
- validation summary rendering
- error/warning list rendering
- lightweight review / re-upload flow

#### Slice 4
- UX polish
- stability improvements
- backend/frontend cleanup

#### Slice 5
- persist a minimal `SubmissionEntity` after successful validation
- return nullable `submissionId` from the validation response
- show submission save confirmation and `submissionId` in the frontend

#### Slice 6
- list saved submissions through a read-only backend endpoint
- render submission history newest first in the frontend
- expose minimal saved metadata only

### Out of Scope (Current State)

- approval workflow
- correction grid
- duplicate detection
- row data storage
- validation result blob storage
- final submit action
- editing submissions
- re-validation from history
- delete functionality

---

## 7. Submission Wizard and Read Visibility (Current State)

### Step 1 - Upload and Identify Template (Implemented)

User uploads Excel workbook.

System:
1. reads workbook
2. reads `__metadata__`
3. extracts metadata
4. resolves version using `version_id`
5. compares `schema_hash`
6. returns identification result

Frontend:
- renders identify status
- renders resolved version details
- renders manual fallback UI only for supported non-resolved states

### Step 2 - Validate and Review Results (Implemented)

Backend:
- workbook structure validation
- expected business-sheet checks
- required header checks
- row iteration across business sheets
- required-field checks
- type checks for supported field types
- enum validation
- min/max validation where schema supports those rules
- minimal submission persistence after successful validation
- compact backend validation report including nullable `submissionId`

Frontend:
- shows `Validate Workbook` only after `EXACT_MATCH`
- calls the backend validation endpoint
- renders summary counts, issue list, and submission save result
- differentiates warnings from errors

### Step 3 - Review / Restart (Lightweight)

Implemented:
- lightweight summary panel
- re-upload / restart action

Not implemented:
- workflow
- correction workflow
- final submit

### Submission History (Implemented, Read-only)

Backend:
- returns compact saved submission rows from `GET /api/submissions`
- orders history newest first
- may include template name and version number when available

Frontend:
- renders read-only history page
- shows submission ID, template/version, status, created time, and file name
- does not expose edit, delete, resubmit, or workflow actions

---

## 8. Identity Resolution Rules (Implemented)

Metadata fields:
- `version_id` -> required (primary resolver)
- `schema_hash` -> required (match check)
- `template_id` -> advisory only
- `version_number` -> advisory only

Important rules:
- `version_id` is the only resolver
- `schema_hash` is the required identity check
- no backend fallback to latest version
- manual fallback is frontend only
- advisory fields do not override identity result

---

## 9. Metadata Contract

Source:
- sheet: `__metadata__`

Rules:
- `Instructions` sheet is ignored for identity and validation
- `_validation` sheet is ignored for identity and validation
- only `__metadata__` is used for identity

---

## 10. Backend Design

Module:

`com.eca.submission`

Subpackages:
- `controller`
- `service`
- `parser`
- `dto`
- `model`
- `exception`
- `entity`
- `repository`

Responsibilities:

controller:
- expose identify endpoint
- expose validation endpoint
- expose read-only history endpoint

service:
- orchestrate upload -> parse -> resolve -> compare
- validate workbook against resolved schema
- perform structure checks before row / cell checks
- persist minimal validated submission metadata after successful validation
- list read-only submission history

parser:
- read workbook
- extract metadata
- provide workbook access for validation

entity / repository:
- store validated submission metadata only
- list saved submission metadata for read-only history
- do not store row data or validation blobs

---

## 11. Backend API

### Identify Endpoint

`POST /api/submissions/identify`

### Validation Endpoint

`POST /api/submissions/validate`

Current behavior:
- includes full backend workbook validation
- persists a minimal submission record only when validation returns no blocking errors
- returns `submissionId` when persistence succeeds, otherwise `null`
- frontend presents this action as "Validate Workbook"

### History Endpoint

`GET /api/submissions`

Current behavior:
- returns compact saved submission items only
- history is read-only
- newest submissions are returned first

---

## 12. Frontend Design

`features/submission`

- `api.ts`
- `types.ts`
- `pages/SubmissionWizardPage.tsx`
- `pages/SubmissionHistoryPage.tsx`
- `components/UploadIdentifyStep.tsx`
- `components/IdentityResultCard.tsx`
- `components/ValidationSummaryCard.tsx`
- `components/ValidationIssueList.tsx`
- `components/SubmissionReviewCard.tsx`

Rules:
- Step 1 is functional
- Step 2 is functional
- Step 3 is lightweight only
- history is read-only only
- no fake submit workflow
- no fallback automation
- no correction editing
- validation success shows the saved submission record ID only

---

## 13. Implementation Slices

### Slice 1 (Done)

- backend identify flow
- metadata parsing
- identity resolution
- landing page

### Slice 2A (Done)

- backend workbook structure validation
- workbook/sheet/header checks

### Slice 2B (Done)

- backend row / cell validation
- required checks
- type checks
- enum checks
- min/max checks
- compact issue reporting

### Slice 3 (Done)

- frontend validation UI
- results rendering
- restart / re-upload flow

### Slice 4 (Done)

- UX polish
- stability
- cleanup

### Slice 5 (Done)

- minimal submission persistence
- nullable `submissionId` in validation response
- frontend success display for saved submission

### Slice 6 (Done)

- read-only submission history endpoint
- read-only submission history page
- no details, edit, or workflow actions

---

## 14. Acceptance Criteria (Current State)

System is valid when:

1. user uploads workbook
2. metadata is read
3. version is resolved using `version_id`
4. `schema_hash` is compared
5. frontend clearly renders identify result states
6. validation runs only after `EXACT_MATCH`
7. frontend clearly renders validation summary and issue list
8. successful validation persists a minimal submission record and returns `submissionId`
9. frontend displays submission save success and the returned ID
10. user can view saved submissions in a read-only history screen
11. history shows newest submissions first with compact metadata
12. user can restart with a new workbook
13. frontend handles loading and backend error states gracefully

---

## 15. Non-Negotiable Constraints

Codex must not:

- refactor template module broadly
- introduce microservices
- add persistence beyond the minimal validated submission record
- add mutable submission history behavior
- add workflow engine
- redesign export
- fake final submission

---

## Final Note

This spec reflects actual implemented behavior, not theoretical design.

Future slices must build on this identity, validation, minimal persistence, and read-only history contract.
