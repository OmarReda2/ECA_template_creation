# System Flows (v1 — Verified)

## Template Creation Flow

### Step 1 — Frontend

User inputs:
- name
- sectorCode

Request:
POST /api/templates

---

### Step 2 — Controller

TemplateController.createTemplate()
→ forwards request to service

---

### Step 3 — Service Logic

TemplateService.createTemplate():

1. Create TemplateEntity
   - status = DRAFT

2. Persist TemplateEntity

3. Create TemplateVersionEntity (version 1)
   - versionNumber = 1
   - status = DRAFT
   - schemaJson = initial minimal schema
   - schemaHash = "PENDING_HASH"

4. Persist TemplateVersionEntity

---

### Step 4 — Response

Return:
- templateId
- versionId
- versionNumber

---

### Step 5 — Frontend Navigation

Navigate to:
`/templates/create/{templateId}`

---

## Template Load Flow (Partial — Verified)

GET /api/templates/{id}

Service:
- Load template
- Load versions (descending order)

Frontend:
- Select latest version
- Pass versionId to schema editor


## Schema Update Flow

PUT /api/versions/{id}/schema

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

## Submission Flow (Slice 1 — Verified)

### Step 1 — Upload

User uploads Excel workbook.

---

### Step 2 — Backend Parsing

SubmissionService.identify():

1. Parse workbook using SubmissionWorkbookParser
2. Extract metadata from `__metadata__`

---

### Step 3 — Metadata Check

Cases:

#### Case A — Metadata Missing
- No metadata found
→ return METADATA_MISSING

#### Case B — Metadata Invalid
- Missing `version_id` or `schema_hash`
→ return METADATA_INVALID

---

### Step 4 — Version Resolution

- Resolve TemplateVersion using `version_id`

If not found:
→ VERSION_NOT_FOUND

---

### Step 5 — Hash Comparison

Compare:
- metadata.schema_hash
- version.schemaHash

If mismatch:
→ HASH_MISMATCH

If match:
→ EXACT_MATCH

---

### Step 6 — Response

Return:
- status
- metadata
- resolved version (if any)
- messages/warnings