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

## 3. Persistence Is Minimal Only

### Observation
- Successful validation now creates a minimal `SubmissionEntity`
- The saved record contains template/version/hash/status/timestamp metadata only
- Saved submissions are visible through a read-only history screen

### Impact
- Users get a durable reference ID for a validated upload
- The system still does not support resuming, editing, or workflow progression

---

## 4. No Correction Grid or Inline Editing

### Observation
- Validation issues are rendered as read-only results

### Impact
- Users must correct the workbook offline and re-upload

---

## 5. No Submission Workflow or Row Data Storage

### Observation
- Submission persistence does not store workbook row data, validation blobs, approval state, or submit lifecycle state
- Read-only history and read-only details exist, but they expose metadata only

### Impact
- This keeps Slice 5 intentionally small and reversible, but later slices still need explicit design for review, workflow, and data retention
