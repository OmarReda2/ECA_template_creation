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
- Manual fallback now supports real validation against the latest version of the selected template
- Manual version selection is still not supported

### Impact
- Users can now complete fallback-driven validation, but they cannot choose a specific version when multiple versions exist

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

---

## 6. Submission MVP Still Relies on Re-upload for Corrections

### Observation
- Slice 8 improves readability and safety of the current screens
- The user still has to fix workbook issues offline and re-upload to continue

### Impact
- The MVP is now more stable to use end-to-end, but correction guidance and workflow remain intentionally outside the current scope

---

## 7. Wizard State Still Lives In One Page Route

### Observation
- Slice 11 now renders real active step views with gated stepper navigation
- The wizard still uses one route and in-memory page state rather than step-specific routes or persisted drafts

### Impact
- The step UX is now much clearer, but a browser refresh still resets the active wizard state
