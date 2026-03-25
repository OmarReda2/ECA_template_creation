# Submission Module Spec (MVP — Updated & Aligned)

## 1. Purpose

Build the **Submission** module as the next capability of the existing system.

This module allows a user to:

1. upload a filled Excel workbook
2. read workbook metadata
3. identify the intended template/version

---

### Current Implementation Status

- ✅ Slice 1 (Upload & Identify Template) is implemented
- ⛔ Validation (Slice 2) is NOT implemented yet
- ⛔ Submission persistence is NOT implemented

This document includes both:
- implemented behavior (Slice 1)
- planned behavior (future slices)

---

## 2. Application Entry (Landing Page)

The application includes a **simple landing page** as the entry point.

User can choose between:

- **Template Creation & Export**
- **Data Submission**

### Navigation Behavior

- `Create Template` → Template Creation Flow
- `Submit Data` → Submission Flow

### Rules

- Landing page is NOT a business feature
- No authentication logic (yet)
- Must remain minimal and neutral

---

## 3. Architecture Constraints

### Backend

- Modular monolith
- Layered / N-tier architecture
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

Submission MUST reuse:

- Template identity
- Version identity
- Schema JSON
- Schema hash

---

## 5. MVP Scope

### In Scope (Slice 1)

- upload Excel workbook
- read `__metadata__`
- extract:
  - template_id
  - version_id
  - version_number
  - schema_hash
- resolve template version using `version_id`
- compare schema hash
- return identification result
- landing page routing

---

### Out of Scope (Current Slice)

- validation engine
- validation report
- submission persistence
- approval workflow
- correction grid
- duplicate detection
- data storage

---

## 6. Submission Wizard (Planned vs Implemented)

### Step 1 — Upload & Identify Template ✅ (Implemented)

User uploads Excel workbook.

System:

1. reads workbook
2. reads `__metadata__`
3. extracts metadata
4. resolves version using `version_id`
5. compares `schema_hash`
6. returns identification result

---

### Step 2 — Validation & Review ⛔ (Not Implemented)

Planned in Slice 2:

- workbook validation
- schema validation
- validation report

---

### Step 3 — Review ⛔ (Not Implemented)

Planned:

- summary view
- re-upload option

---

## 7. Identity Resolution Rules (Implemented)

### Metadata Fields

- `version_id` → required (primary resolver)
- `schema_hash` → required (match check)
- `template_id` → advisory only
- `version_number` → advisory only

---

### Resolution Logic

1. Metadata missing
→ `METADATA_MISSING`

2. Required fields invalid
→ `METADATA_INVALID`

3. Version not found
→ `VERSION_NOT_FOUND`

4. Schema hash mismatch
→ `HASH_MISMATCH`

5. Schema hash matches
→ `EXACT_MATCH`

---

### Important Rules

- `version_id` is the **only resolver**
- `schema_hash` is the **required identity check**
- No backend fallback to latest version
- Manual fallback is **frontend only**
- Advisory fields do NOT override identity result

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

- `Instructions` sheet is ignored
- `_validation` sheet is ignored
- Only `__metadata__` is used for identity

---

## 9. Hashing Decision

- Use only `schema_hash`
- No `layout_hash`
- Use existing hashing logic as-is

---

## 10. Backend Design

Module:

com.eca.template.submission
  ├── controller
  ├── service
  ├── parser
  ├── dto
  ├── model

---

### Responsibilities

controller:
- expose identify endpoint

service:
- orchestrate upload → parse → resolve → compare

parser:
- read workbook
- extract metadata

---

## 11. Backend API (Slice 1)

POST /api/submissions/identify

Multipart:
- file

---

### Response

- status
- metadata
- resolved version (if found)
- messages

---

### Status Values

- EXACT_MATCH
- METADATA_MISSING
- METADATA_INVALID
- VERSION_NOT_FOUND
- HASH_MISMATCH
- UNSUPPORTED_FILE

---

## 12. Frontend Design

features/submission
 ├ api.ts
 ├ types.ts
 ├ pages
 │   SubmissionWizardPage.tsx
 └ components
     UploadIdentifyStep.tsx

---

### Rules

- Step 1 is functional
- Step 2/3 are placeholders
- show clear result state
- no fake validation UI
- no fallback automation

---

## 13. Implementation Slices

### Slice 1 (DONE)

- backend identify flow
- metadata parsing
- identity resolution
- landing page

---

### Slice 2 (NEXT)

- validation engine
- workbook/sheet/header checks

---

### Slice 3

- frontend validation UI
- results rendering

---

### Slice 4

- polish
- edge cases

---

## 14. Acceptance Criteria (Slice 1)

System is valid when:

1. user uploads workbook
2. metadata is read
3. version is resolved using version_id
4. schema_hash is compared
5. correct status is returned
6. no persistence occurs
7. no validation occurs

---

## 15. Non-Negotiable Constraints

Codex MUST NOT:

- refactor template module
- introduce microservices
- add persistence
- add validation logic
- add workflow engine
- redesign export

---

## Final Note

This spec reflects **actual implemented behavior**, not theoretical design.

Future slices must build on this identity contract.
