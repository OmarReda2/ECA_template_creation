# Submission Module Spec v2 (Aligned to Current MVP)

## Purpose

The submission module handles workbook intake after template export.

Current MVP responsibilities:
- upload workbook
- identify workbook metadata
- validate workbook structure and row/cell content
- support explicit manual fallback validation
- persist a minimal validated submission record
- expose read-only submission history
- expose read-only submission details

## Current Wizard Behavior

### Step 1 — Upload & Identify
- user selects workbook
- frontend auto-identifies
- frontend renders identify result
- unresolved automatic identity may allow manual fallback template selection

### Step 2 — Validate & Review Results
- user explicitly enters Step 2
- frontend auto-starts validation when Step 2 is eligible
- validation results render in Step 2
- manual fallback validation is labeled distinctly from automatic validation

### Step 3 — Review / Restart
- explicit review/restart step only
- no final submit workflow

## Automatic Identity Rules

- `version_id` is the primary automatic resolver
- `schema_hash` is the required automatic match check
- supported identify states:
  - `EXACT_MATCH`
  - `METADATA_MISSING`
  - `METADATA_INVALID`
  - `VERSION_NOT_FOUND`
  - `HASH_MISMATCH`
  - `UNSUPPORTED_FILE`

## Manual Fallback Rules

- manual fallback is explicit only
- manual fallback is allowed when automatic metadata cannot be resolved for validation
- selected template resolves to its **latest version only**
- backend must never silently switch to fallback

## Validation Scope

### Structure
- workbook readable
- expected business sheets exist
- required headers exist
- extra sheets and extra headers are warnings

### Row / Cell
- required field checks
- basic type checks
- enum checks
- numeric min/max checks

## Persistence Scope

Validation with no blocking errors creates a minimal submission record containing:
- `id`
- `templateId`
- `versionId`
- `schemaHash`
- `status`
- `createdAt`
- optional `originalFileName`

Validation errors do not persist.

## Read Visibility

Current MVP also includes:
- `GET /api/submissions`
- `GET /api/submissions/{id}`

These are read-only only.

## Current API

- `POST /api/submissions/identify`
- `POST /api/submissions/validate`
- `GET /api/submissions`
- `GET /api/submissions/{id}`

## Frontend Entry / Navigation

- landing page route: `/`
- landing page is a first-class app navigation entry
- submission wizard route: `/submissions`
- submission history route: `/submissions/history`
- submission details route: `/submissions/:id`

## Acceptance Criteria (Current MVP)

- user can identify a workbook automatically when metadata resolves
- user can validate through automatic exact-match path
- user can validate through explicit manual fallback path
- successful validation returns `submissionId`
- successful validation persists a minimal submission record
- user can view saved submissions in read-only history
- user can open one submission in read-only details

## Explicitly Out of Scope

- approval workflow
- correction/edit grid
- row-data persistence
- validation blob persistence
- manual version selector for fallback
- re-validation from history/details
- delete/edit submission actions
