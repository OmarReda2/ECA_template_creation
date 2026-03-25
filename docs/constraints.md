# System Constraints (v1 - Verified)

## Architecture Constraints
- System uses layered architecture
- Controllers must remain thin
- Services contain business logic
- Repositories handle persistence only

---

## Versioning Constraints
- Every template creation creates version 1
- Version number starts at 1
- Version is linked to template via relation

---

## Schema Constraints
- Schema is stored as JSON (JSONB)
- Initial schema is created during template creation
- Submission validation must read the existing `schemaJson` from `TemplateVersionEntity`

---

## Hash Constraints
- Initial schemaHash is set to `PENDING_HASH`
- Hash is updated later during schema update (not during creation)
- Submission validation still requires `EXACT_MATCH` identity before row/cell validation proceeds

---

## Frontend Constraints (Observed)
- Frontend sends only:
  - name
  - sectorCode
- Frontend does not construct schema during creation step

---

## Schema Update Constraints

- Schema must pass validation before saving
- Schema hash is recomputed on every update
- Schema hash must reflect schemaJson
- Schema update overwrites existing schema (no partial merge)

---

## Submission Constraints (Current)

- Submission must not modify template module behavior
- Submission must reuse existing `TemplateVersionEntity` as source of truth
- `version_id` is the primary identity resolver
- `schema_hash` is required for match validation
- No backend fallback to latest version is allowed
- Manual fallback is frontend-driven only
- No submission persistence in MVP
- Validation remains backend-only for now

---

## Submission Validation Constraints (Slice 2B)

- Validation runs only after `EXACT_MATCH`
- Ignore `__metadata__`, `_validation`, and `Instructions` as business sheets
- Missing sheets are errors
- Missing required headers are errors
- Extra sheets are warnings
- Extra headers are warnings
- Fully blank rows are skipped
- Validation currently covers only:
  - required-field checks
  - basic type checks
  - enum checks
  - numeric min/max checks

Still not implemented:
- persistence
- correction grid
- approval workflow
- review/edit workflow
- frontend validation polish
- duplicate detection
