# Known Gaps / Weaknesses (v1 — Verified)

This document lists observed issues and weak points in the current system behavior.
It reflects the system **as implemented**, not intended design.

---

## 1. Schema Hash Lifecycle

### Observation
- Initial version (v1) is created with:
  - schemaHash = "PENDING_HASH"
- Hash is only generated during schema update.

### Issue
- If the user does not perform a schema update:
  - schemaHash remains "PENDING_HASH"
- Export may include this non-final hash in metadata.

### Impact
- Metadata may not accurately represent schema identity.
- Downstream validation (e.g., submission) may be unreliable.

---

## 2. Missing Enforcement: Latest Version Only Editable

### Observation
- Schema update endpoint:
  PUT /api/versions/{id}/schema
- No clear enforcement that only the latest version can be updated.

### Issue
- Older versions may be modified if accessed.

### Impact
- Breaks version immutability expectations.
- Historical integrity is not guaranteed.

---

## 3. Missing Status-Based Edit Restrictions

### Observation
- TemplateVersionEntity has a `status` field (e.g., DRAFT, READ_ONLY).
- No visible strict check before allowing schema updates.

### Issue
- Non-editable versions (e.g., READ_ONLY) may still be modified.

### Impact
- Status does not reliably enforce behavior.
- Lifecycle control is weak.

---

## 4. Mutable Version Model (No Snapshot Protection)

### Observation
- Schema update overwrites:
  - schemaJson
  - schemaHash
- No new version is created during updates.

### Issue
- Same version is repeatedly mutated.

### Impact
- Version does not represent a stable snapshot.
- Changes are not historically traceable within a version.

---

## 5. Template Status Underutilized

### Observation
- TemplateEntity has a `status` field.
- No clear business logic uses this field meaningfully.

### Issue
- Template status appears redundant or unused.

### Impact
- Confusion in lifecycle modeling.
- Potential duplication with version status.

---

## 6. Weak Separation Between Template and Version Lifecycle

### Observation
- Both Template and TemplateVersion have status fields.
- Version status has partial behavioral meaning.
- Template status does not drive behavior.

### Issue
- Responsibilities between template-level and version-level lifecycle are unclear.

### Impact
- Inconsistent lifecycle modeling.
- Future features may introduce conflicting logic.

---

## 7. No Guard Against Duplicate Template Creation

### Observation
- Template creation does not enforce uniqueness (e.g., name, sector).

### Issue
- Duplicate templates may be created.

### Impact
- Data duplication.
- Potential confusion in template selection and management.

---

## 8. Hardcoded createdBy Value

### Observation
- Frontend sends:
  createdBy = "system"

### Issue
- Audit data is not user-driven.

### Impact
- No real traceability of actions.
- Will require refactoring when authentication is introduced.

---

## 9. Export Flow Does Not Enforce Hash Validity

### Observation
- Export uses schemaHash as stored.
- No validation that hash is final (not "PENDING_HASH").

### Issue
- Export may proceed with invalid or placeholder hash.

### Impact
- Inconsistent metadata.
- Weak contract with downstream consumers.

---

## 10. Full Schema Overwrite (No Partial Update)

### Observation
- Schema update replaces entire schemaJson.

### Issue
- No support for partial updates or merging.

### Impact
- Higher risk of accidental data loss.
- Requires full schema resubmission for small changes.

---

## 11. Implicit Canonicalization (Hidden Behavior)

### Observation
- Canonicalization depends on ObjectMapper configuration.

### Issue
- No explicit canonicalization step or documentation in code.

### Impact
- Behavior is implicit and may be misunderstood.
- Future changes to serialization may break hash consistency.

---


## 12. Submission Depends on PENDING_HASH (New)

### Observation
- Some versions may have schemaHash = "PENDING_HASH"

### Issue
- Submission identity may match using non-final hash

### Impact
- Weak identity guarantee
- Potential false-positive matches

---

## 13. Metadata Contract Not Strictly Enforced

### Observation
- Metadata parsing depends on workbook structure
- No strict validation of metadata sheet format

### Issue
- Missing or malformed metadata may behave inconsistently

### Impact
- Unreliable identification results

---

## 14. No Backend Fallback Strategy

### Observation
- System intentionally avoids backend fallback

### Issue
- User must manually resolve failures

### Impact
- UX dependency on frontend correctness


## Summary

The system is:
- functionally correct for MVP
- structurally simple
- but lacks strong enforcement of:
  - version immutability
  - lifecycle control
  - schema hash consistency

These gaps should be addressed incrementally, not all at once.


