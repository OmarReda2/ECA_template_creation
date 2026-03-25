# Known Gaps / Weaknesses (v1 - Verified)

This document lists observed issues and weak points in the current system behavior.
It reflects the system as implemented, not intended design.

---

## 1. Schema Hash Lifecycle

### Observation
- Initial version (v1) is created with `schemaHash = "PENDING_HASH"`
- Hash is only generated during schema update

### Impact
- Submission identity may match using a non-final hash

---

## 2. Manual Fallback UX Is Still Partial

### Observation
- Manual fallback UI exists for unresolved identify states
- Fallback does not lead into a real validation path in the current MVP

### Impact
- Users can understand fallback intent, but cannot complete a fallback-driven validation/submission flow yet

---

## 3. No Persistence or Final Submit

### Observation
- Submission remains in-memory / request-driven only

### Impact
- Users cannot save, resume, or finalize a submission

---

## 4. No Correction Grid or Inline Editing

### Observation
- Validation issues are rendered as read-only results

### Impact
- Users must correct the workbook offline and re-upload
