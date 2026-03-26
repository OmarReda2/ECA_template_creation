# System Constraints (Current MVP)

## Architecture Constraints

- keep the system as a modular monolith
- keep backend layered / n-tier
- keep submission as a sibling feature area, not nested under template
- reuse template/version/schema data as the source of truth

## Submission Validation Constraints

- automatic identify uses `version_id` as the primary resolver
- `schema_hash` is the required automatic match check
- automatic validation must not proceed unless automatic identity resolves correctly
- manual fallback must be explicit
- manual fallback may use only the latest version of the selected template
- backend must never silently switch to fallback

## Submission Persistence Constraints

- persist only after validation completes without blocking errors
- persist only minimal submission metadata
- do not store row data
- do not store validation blobs
- do not add workflow state in the current MVP

## Submission UI Constraints

- landing page remains the main app entry point
- landing page must be reachable from app navigation
- submission wizard must use one explicit active step at a time
- Step 1 owns upload + identify + fallback selection
- Step 2 owns validation loading + validation results
- Step 3 owns review/restart only
- manual fallback must remain visually distinct from automatic identification
- history/details remain read-only only

## Still Not Implemented

- approval workflow
- correction grid
- inline editing
- manual version selector
- submission edit/delete
- re-validation from history/details
