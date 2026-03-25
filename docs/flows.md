# System Flows (v1 - Verified)

## Template Creation Flow

### Step 1 - Frontend

User inputs:
- name
- sectorCode

Request:
`POST /api/templates`

---

### Step 2 - Controller

`TemplateController.createTemplate()`
-> forwards request to service

---

### Step 3 - Service Logic

`TemplateService.createTemplate()`

1. Create `TemplateEntity`
   - status = `DRAFT`
2. Persist `TemplateEntity`
3. Create `TemplateVersionEntity` (version 1)
   - versionNumber = 1
   - status = `DRAFT`
   - schemaJson = initial minimal schema
   - schemaHash = `PENDING_HASH`
4. Persist `TemplateVersionEntity`

---

### Step 4 - Response

Return:
- templateId
- versionId
- versionNumber

---

### Step 5 - Frontend Navigation

Navigate to:
`/templates/create/{templateId}`

---

## Template Load Flow (Partial - Verified)

`GET /api/templates/{id}`

Service:
- Load template
- Load versions (descending order)

Frontend:
- Select latest version
- Pass versionId to schema editor

---

## Schema Update Flow

`PUT /api/versions/{id}/schema`

1. Load version
2. Validate schema
3. Canonicalize JSON
4. Generate schema hash
5. Overwrite schemaJson and schemaHash
6. Persist version

Notes:
- Same version is updated (no new version created)
- Hash reflects current schema state

---

## Submission Flow - Identify (Slice 1 - Verified)

### Step 1 - Upload

User uploads Excel workbook.

### Step 2 - Backend Parsing

`SubmissionService.identify()`

1. Parse workbook using `SubmissionWorkbookParser`
2. Extract metadata from `__metadata__`

### Step 3 - Metadata Check

Cases:

- Metadata missing -> `METADATA_MISSING`
- Missing `version_id` or `schema_hash` -> `METADATA_INVALID`

### Step 4 - Version Resolution

- Resolve `TemplateVersion` using `version_id`
- If not found -> `VERSION_NOT_FOUND`

### Step 5 - Hash Comparison

Compare:
- `metadata.schema_hash`
- `version.schemaHash`

If mismatch -> `HASH_MISMATCH`

If match -> `EXACT_MATCH`

### Step 6 - Response

Return:
- status
- metadata
- resolved version (if any)
- messages/warnings

---

## Submission Flow - Backend Validation (Slice 2A + Slice 2B)

Endpoint:
`POST /api/submissions/validate-structure`

### Step 1 - Identity Gate

1. Run the existing identify flow
2. Require `EXACT_MATCH`
3. If identity fails, return compact validation errors and stop

### Step 2 - Resolve Validation Target

1. Load `TemplateVersionEntity` using resolved `version_id`
2. Read `schemaJson` as the validation source of truth
3. Build expected business-sheet and field definitions from schema tables/fields

### Step 3 - Workbook-Level Filtering

Ignore these non-business sheets:
- `__metadata__`
- `_validation`
- `Instructions`

### Step 4 - Structure Validation

For each expected schema table:

1. Check that the expected sheet exists
2. Read the header row
3. Check required exported header names
4. Report:
   - missing sheets as errors
   - missing headers as errors
   - extra sheets as warnings
   - extra headers as warnings

If blocking structure errors exist:
- do not pretend row/cell validation succeeded
- return structure issues with `rowsChecked = 0`

### Step 5 - Row Iteration

For each business sheet that passed required-header checks:

1. Iterate data rows after the header row
2. Skip fully blank rows
3. Count validated rows in `rowsChecked`

### Step 6 - Cell Validation

For each schema field in each validated row:

1. Required check
   - blank required cell -> error
2. Type check
   - TEXT
   - NUMBER
   - DATE
   - BOOLEAN
   - CURRENCY
3. Enum check
   - validate against `validations.enumValues` or `validations.enum`
4. Min/max check
   - apply where schema provides numeric bounds

### Step 7 - Issue Reporting

Return a compact validation report containing:
- target version info
- sheets checked
- rows checked
- errors
- warnings
- per-sheet header issues

Issue location includes:
- sheet name
- row number when applicable
- header name when applicable
- code
- message
- severity
