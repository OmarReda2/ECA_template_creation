# System Constraints (v1 — Verified)

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

---

## Hash Constraints
- Initial schemaHash is set to "PENDING_HASH"
- Hash is updated later during schema update (not during creation)

---

## Frontend Constraints (Observed)
- Frontend sends only:
  - name
  - sectorCode
- Frontend does not construct schema during creation step


## Schema Update Constraints

- Schema must pass validation before saving
- Schema hash is recomputed on every update
- Schema hash must reflect schemaJson
- Schema update overwrites existing schema (no partial merge)



---

## Submission Constraints (New — Verified)

- Submission must NOT modify template module behavior
- Submission must reuse existing TemplateVersionEntity as source of truth
- `version_id` is the primary identity resolver
- `schema_hash` is required for match validation
- No backend fallback to latest version is allowed
- Manual fallback is frontend-driven only
- No submission persistence in MVP
- No validation logic in Slice 1