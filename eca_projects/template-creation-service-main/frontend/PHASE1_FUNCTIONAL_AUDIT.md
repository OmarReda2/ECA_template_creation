# Phase 1 – Functional Audit & Fixes

## Backend contract (reference)

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/templates | Create template (+ v1 DRAFT) |
| GET | /api/templates/{templateId} | Get template + version summaries |
| POST | /api/templates/{templateId}/versions | Create new version |
| GET | /api/versions/{versionId} | Get version + schema_json, schema_hash |
| PUT | /api/versions/{versionId}/schema | Update schema (latest only) |
| POST | /api/versions/{versionId}/export | Export XLSX (blob) |

**Note:** There is no `GET /api/templates` (list) in the backend. The frontend calls it and falls back to an empty array on failure, so the templates list is empty until/unless the backend adds a list endpoint.

---

## Functional issues found

### 1. **Error handling – wrong normalizer (fixed)**

- **Where:** TemplatesListPage (list load + create submit), TemplateDetailsPage (template load + create version).
- **Issue:** These flows used `normalizeError(e)` when catching API errors. For axios, the backend error body is in `e.response.data`; `normalizeError(e)` only sees the Error instance, so the UI showed generic messages (e.g. "Request failed with status code 400") and lost HTTP status and `fieldErrors`.
- **Fix:** Use `normalizeHttpError(e)` for all API catch blocks in:
  - `TemplatesListPage.tsx`: load list and create template.
  - `TemplateDetailsPage.tsx`: load template and create version.
- **Result:** 400 validation errors now show backend message and field errors; 404/409/5xx show correct status and message.

### 2. **Templates list – no list endpoint (no code change)**

- **Issue:** Backend does not expose `GET /api/templates`. The frontend calls it and uses `.catch(() => [])`, so the list is always empty unless the backend adds the endpoint.
- **Status:** Accepted. Fallback is correct; no change. When the backend adds a list endpoint, the same call will return data.

### 3. **Create template → redirect (verified correct)**

- **Requirement:** After create, redirect to details with correct `templateId`.
- **Status:** Implemented. `TemplatesListPage` uses `navigate(\`/templates/${res.templateId}\`)` after `templatesApi.create()`. Backend returns `CreateTemplateResponse { templateId, versionId, versionNumber }`.

### 4. **Template details – versions (verified correct)**

- **Requirement:** Load template by id and show versions correctly.
- **Status:** Implemented. `templatesApi.getById(templateId)` loads template; `template.versions` is rendered. Backend returns `TemplateDetailResponse` with `versions` (VersionSummaryDto[]).

### 5. **Create new version – refresh and READ_ONLY (verified correct)**

- **Requirement:** Create new version, refresh list, previous version marked READ_ONLY.
- **Status:** Implemented. After `versionsApi.create()`, `loadTemplate()` is called; backend sets previous latest to READ_ONLY and returns updated template with versions.

### 6. **Schema editor – load, PUT, 400, 409 (verified correct)**

- **Requirement:** Load version, PUT valid schema JSON, handle 400 validation errors and 409 read-only.
- **Status:** Implemented. `versionsApi.getById(versionId)` loads version; `versionsApi.updateSchema(versionId, parsed)` sends PUT body; 400 shows `ErrorPanel` with `getErrorMessage(err, true)` (message + fieldErrors); 409 shows dedicated read-only message and link back to template details.

### 7. **Export – XLSX download (verified correct)**

- **Requirement:** Export must download XLSX (responseType blob).
- **Status:** Implemented. `exportVersion()` uses `http.post(..., { responseType: 'blob' })`; `downloadBlobWithDisposition()` uses Content-Disposition or fallback filename.

---

## Code changes (Phase 1)

- **`src/features/templates/pages/TemplatesListPage.tsx`**  
  - Use `normalizeHttpError` instead of `normalizeError` for list load and create submit catch blocks.  
  - Import updated accordingly.

- **`src/features/templates/pages/TemplateDetailsPage.tsx`**  
  - Use `normalizeHttpError` instead of `normalizeError` for template load and create-version catch blocks.  
  - Removed unused `normalizeError` import.

No other code changes in Phase 1. No refactors to folder structure or new UI libraries. Phase 2 (visual alignment with CTO HTML template, UX polish) is not started as requested.
