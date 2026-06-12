# Known Gaps / Technical Debt (Current MVP)

## 1. Persistence Is Intentionally Minimal

Saved submissions currently store metadata only.

Still missing:
- row-data persistence
- validation blob persistence
- workflow state
- resume/edit capabilities

## 2. Manual Fallback Uses Latest Version Only

Manual fallback is now a real validation path, but users cannot choose a specific template version.

## 3. No Workflow or Correction Experience

Still not implemented:
- approval workflow
- correction/edit grid
- inline issue remediation
- final submit lifecycle

## 4. History and Details Are Read-Only

Users can inspect saved submissions, but cannot:
- edit
- delete
- re-validate from saved records

## 5. Wizard State Is Route-Local

The submission wizard now has deterministic step state, but it still uses one route with in-memory state.

Impact:
- browser refresh resets the current in-progress wizard session
