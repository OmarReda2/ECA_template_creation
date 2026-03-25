# System Flows (v1 - Verified)

## Template Creation Flow

### Step 1 - Frontend

User inputs:
- name
- sectorCode

Request:
`POST /api/templates`

### Step 2 - Controller

`TemplateController.createTemplate()`
-> forwards request to service

### Step 3 - Service Logic

`TemplateService.createTemplate()`

1. Create `TemplateEntity`
2. Persist `TemplateEntity`
3. Create `TemplateVersionEntity` (version 1)
4. Persist `TemplateVersionEntity`

### Step 4 - Response

Return:
- templateId
- versionId
- versionNumber

---

## Submission Flow - Frontend + Backend (Current)

### Step 1 - Upload and Identify

Frontend:

1. User selects `.xlsx` workbook
2. Frontend calls `POST /api/submissions/identify`
3. Frontend renders:
   - identify status
   - extracted metadata
   - resolved version summary
   - messages from backend

Backend:

1. Parse workbook using `SubmissionWorkbookParser`
2. Extract metadata from `__metadata__`
3. Resolve version using `version_id`
4. Compare `schema_hash`
5. Return identify response

### Step 2 - Validation Gate

Frontend:

- show `Validate Workbook` only when identify status is `EXACT_MATCH`
- block validation UI for all other identify states
- allow restart / re-upload

### Step 3 - Workbook Validation

Frontend:

1. User clicks `Validate Workbook`
2. Frontend calls `POST /api/submissions/validate`
3. Frontend shows loading state

Backend:

1. Re-run identity gate and require `EXACT_MATCH`
2. Resolve `TemplateVersionEntity`
3. Read schema JSON
4. Ignore non-business sheets:
   - `__metadata__`
   - `_validation`
   - `Instructions`
5. Validate workbook structure
6. If structure is clean enough, validate row/cell content

### Step 4 - Persist Validated Submission

Backend:

1. Check for blocking validation errors
2. If errors exist, do not persist and return `submissionId = null`
3. If no blocking errors exist, create a minimal `SubmissionEntity`
4. Return validation response with `submissionId`

### Step 5 - Results Rendering

Frontend renders:

- target version info
- submission ID when persistence succeeds
- sheets checked
- rows checked
- error count
- warning count
- issue list with:
  - severity
  - sheet name
  - row number when present
  - header name when present
  - message
- grouped for readability, with errors shown ahead of warnings
- success feedback when a submission record is saved

### Step 6 - Review / Restart

Frontend provides:

- lightweight review panel
- re-upload / restart action
- graceful error display when backend returns an unexpected failure

### Step 7 - Read-only Submission History

Frontend:

1. User opens the submission history screen
2. Frontend calls `GET /api/submissions`
3. Frontend renders saved submissions newest first

Backend:

1. Read saved `SubmissionEntity` rows ordered by `createdAt` descending
2. Enrich compact history rows with template name and version number when available
3. Return read-only history items only

Not provided:

- final submit
- correction editing
- history actions beyond read-only viewing
- workflow state changes
