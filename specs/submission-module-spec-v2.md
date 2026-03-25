# Submission Module Spec (MVP - Updated and Aligned)

## 1. Purpose

Build the **Submission** module as the next capability of the existing system.

This module allows a user to:

1. upload a filled Excel workbook
2. read workbook metadata
3. identify the intended template/version
4. validate workbook structure and row/cell content against the resolved schema

---

### Current Implementation Status

- Slice 1 (Upload and Identify Template) is implemented
- Slice 2A (Backend Workbook Structure Validation) is implemented
- Slice 2B (Backend Row / Cell Validation) is implemented
- Submission persistence is not implemented

This document includes both:
- implemented behavior (Slice 1 + Slice 2A + Slice 2B)
- planned behavior (future slices)

---

## 2. Application Entry (Landing Page)

The application includes a **simple landing page** as the entry point.

User can choose between:

- **Template Creation and Export**
- **Data Submission**

### Navigation Behavior

- `Create Template` -> Template Creation Flow
- `Submit Data` -> Submission Flow

### Rules

- Landing page is not a business feature
- No authentication logic yet
- Must remain minimal and neutral

---

## 3. Architecture Constraints

### Backend

- Modular monolith
- Layered / n-tier architecture
- Submission is a separate module
- Reuse Template + Version as source of truth
- No forced shared module

### Frontend

- Extend existing structure
- Add submission feature/module
- Add landing page routing
- Reuse current UI patterns

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

## 4. Existing System Assumptions

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

## 5. MVP Scope

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

### Out of Scope (Current State)

- validation UI polish
- submission persistence
- approval workflow
- correction grid
- duplicate detection
- data storage

---

## 6. Submission Wizard (Planned vs Implemented)

### Step 1 - Upload and Identify Template (Implemented)

User uploads Excel workbook.

System:

1. reads workbook
2. reads `__metadata__`
3. extracts metadata
4. resolves version using `version_id`
5. compares `schema_hash`
6. returns identification result

---

### Step 2 - Validation and Review (Backend Implemented)

#### Implemented in Slice 2A + Slice 2B

- workbook structure validation
- expected business-sheet checks
- required header checks
- row iteration across business sheets
- required-field checks
- type checks for supported field types
- enum validation
- min/max validation where schema supports those rules
- compact backend validation report

#### Not Implemented Yet

- full validation review UI
- inline correction behavior

---

### Step 3 - Review (Not Implemented)

Planned:

- summary view
- re-upload option

---

## 7. Identity Resolution Rules (Implemented)

### Metadata Fields

- `version_id` -> required (primary resolver)
- `schema_hash` -> required (match check)
- `template_id` -> advisory only
- `version_number` -> advisory only

---

### Resolution Logic

1. Metadata missing
-> `METADATA_MISSING`

2. Required fields invalid
-> `METADATA_INVALID`

3. Version not found
-> `VERSION_NOT_FOUND`

4. Schema hash mismatch
-> `HASH_MISMATCH`

5. Schema hash matches
-> `EXACT_MATCH`

---

### Important Rules

- `version_id` is the only resolver
- `schema_hash` is the required identity check
- No backend fallback to latest version
- Manual fallback is frontend only
- Advisory fields do not override identity result

---

## 8. Metadata Contract

### Source

- Sheet: `__metadata__`

---

### Fields

| Field | Type | Role |
|------|------|------|
| template_id | string | advisory |
| version_id | string (UUID) | required |
| version_number | string/int | advisory |
| schema_hash | string | required |
| generated_at | string | informational |
| generator_version | string | informational |

---

### Rules

- `Instructions` sheet is ignored for identity and validation
- `_validation` sheet is ignored for identity and validation
- Only `__metadata__` is used for identity

---

## 9. Hashing Decision

- Use only `schema_hash`
- No `layout_hash`
- Use existing hashing logic as-is

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

---

### Responsibilities

controller:
- expose identify endpoint
- expose validation endpoint

service:
- orchestrate upload -> parse -> resolve -> compare
- validate workbook against resolved schema
- perform structure checks before row / cell checks

parser:
- read workbook
- extract metadata
- provide workbook access for validation

---

## 11. Backend API

### Slice 1 - Identify Endpoint

`POST /api/submissions/identify`

Multipart:
- file

Response:
- status
- metadata
- resolved version (if found)
- messages

Status values:
- EXACT_MATCH
- METADATA_MISSING
- METADATA_INVALID
- VERSION_NOT_FOUND
- HASH_MISMATCH
- UNSUPPORTED_FILE

---

### Validation Endpoint (Slice 2A + Slice 2B)

`POST /api/submissions/validate-structure`

Multipart:
- file

Behavior:
- validation proceeds only after `EXACT_MATCH`
- reads schema from resolved template version
- validates required business sheets and headers first
- validates row / cell content only when structure errors do not block the sheet/workbook

Response includes:
- target version info
- sheets checked
- rows checked
- errors
- warnings
- issue location:
  - sheet name
  - row number
  - header name
- per-sheet header issues

---

## 12. Frontend Design

`features/submission`

- `api.ts`
- `types.ts`
- `pages/SubmissionWizardPage.tsx`
- `components/UploadIdentifyStep.tsx`

### Rules

- Step 1 is functional
- Step 2/3 are still mostly placeholders
- show clear result state
- no fallback automation

---

## 13. Implementation Slices

### Slice 1 (Done)

- backend identify flow
- metadata parsing
- identity resolution
- landing page

---

### Slice 2A (Done)

- backend workbook structure validation
- workbook/sheet/header checks

---

### Slice 2B (Done)

- backend row / cell validation
- required checks
- type checks
- enum checks
- min/max checks
- compact issue reporting

---

### Slice 3

- frontend validation UI
- results rendering

---

### Slice 4

- polish
- edge cases

---

## 14. Acceptance Criteria (Current Backend State)

System is valid when:

1. user uploads workbook
2. metadata is read
3. version is resolved using `version_id`
4. `schema_hash` is compared
5. structure validation checks required business sheets and headers
6. row / cell validation checks required values and supported schema rules
7. validation response reports compact issue locations
8. no persistence occurs

---

## 15. Non-Negotiable Constraints

Codex must not:

- refactor template module broadly
- introduce microservices
- add persistence
- add workflow engine
- redesign export

---

## Final Note

This spec reflects actual implemented behavior, not theoretical design.

Future slices must build on this identity and validation contract.
