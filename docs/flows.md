# System Flows (Current MVP)

## 1. Landing Flow

1. User opens `/`
2. Landing page presents two primary routes:
   - Template Creation & Export
   - Data Submission
3. User enters the appropriate flow from the landing page or sidebar navigation

## 2. Template Creation & Export

1. User creates a template
2. Backend creates template + initial version
3. User edits latest-version schema
4. Backend validates and stores schema JSON + schema hash
5. User exports workbook
6. Backend generates Excel with embedded `__metadata__`

## 3. Submission Wizard

### Step 1 — Upload & Identify

1. User selects `.xlsx` workbook
2. Frontend auto-calls `POST /api/submissions/identify`
3. Backend reads `__metadata__`
4. Backend resolves version using `version_id`
5. Backend compares `schema_hash`
6. Frontend renders identify result and any backend messages

If automatic identity is unresolved:
- frontend allows explicit manual fallback template selection
- latest version of that template becomes the manual validation target

### Step 2 — Validate & Review Results

1. User explicitly enters Step 2
2. Frontend auto-starts validation when Step 2 is eligible
3. Frontend calls `POST /api/submissions/validate`
4. Backend validates workbook structure
5. Backend validates row/cell content
6. If manual fallback was selected:
   - backend validates against the latest version of the selected template
   - response marks `validationTargetSource = MANUAL_FALLBACK`
7. If validation has no blocking errors:
   - backend persists minimal submission record
   - backend returns `submissionId`
8. Frontend stays on Step 2 and renders:
   - target version info
   - counts
   - issue list
   - `submissionId` when saved

### Step 3 — Review / Restart

1. User explicitly enters Step 3 after validation
2. Frontend renders lightweight review/restart state only
3. User may go back to validation results or restart with a new workbook

## 4. Submission History

1. User opens `/submissions/history`
2. Frontend calls `GET /api/submissions`
3. Backend returns saved submissions newest first
4. Frontend renders read-only history list

## 5. Submission Details

1. User opens `/submissions/:id`
2. Frontend calls `GET /api/submissions/{id}`
3. Backend returns one saved submission or `404`
4. Frontend renders read-only details, not-found, or generic error state
