# System Constraints (v1 - Verified)

## Architecture Constraints

- System uses layered architecture
- Controllers remain thin
- Services contain business logic
- Repositories handle persistence only

---

## Submission Constraints (Current)

- Submission must not modify template module behavior
- Submission must reuse existing `TemplateVersionEntity` as source of truth
- `version_id` is the primary identity resolver
- `schema_hash` is required for match validation
- No backend fallback to latest version is allowed
- Manual fallback remains frontend-driven only
- Submission persistence is limited to a minimal validated record only
- Submission persistence must happen only after validation completes without blocking errors
- Submission must not store row data or validation result blobs
- Submission history is read-only only
- Submission details view is read-only only
- Submission stabilization must not change validation or persistence business rules

---

## Backend Validation Constraints

- Validation runs only after `EXACT_MATCH`
- Ignore `__metadata__`, `_validation`, and `Instructions` as business sheets
- Missing sheets are errors
- Missing required headers are errors
- Extra sheets are warnings
- Extra headers are warnings
- Fully blank rows are skipped
- Validation currently covers:
  - required-field checks
  - basic type checks
  - enum checks
  - numeric min/max checks
- Persistence is blocked when validation errors exist
- Warnings do not block persistence

---

## Frontend Submission UI Constraints

- Keep the current app layout and route structure
- Frontend uses `POST /api/submissions/validate`
- UI should say "Validate Workbook"
- Validation must not be shown as available unless identify returns `EXACT_MATCH`
- Warnings and errors must render distinctly
- Step 3 remains lightweight review / restart only
- Unexpected backend errors should surface as user-friendly UI feedback, not a crash
- Successful validation may only show a saved submission confirmation and ID
- Submission history may only show saved metadata and must not expose edit or workflow actions
- Submission details may only show saved metadata and must not expose edit, delete, or revalidate actions
- Submission screens must guard nullable backend fields and render readable empty/not-found states

Still not implemented:
- correction grid
- approval workflow
- final submit workflow
- inline spreadsheet editing
- row data persistence
- editable history actions
- editable details actions
