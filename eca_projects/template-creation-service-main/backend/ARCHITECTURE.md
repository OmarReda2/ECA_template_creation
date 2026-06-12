# Backend Architecture

## Style

The backend currently follows a **layered / n-tier** structure:

`Controller -> Service -> Repository -> Database`

## Feature Areas

### Template
- package root: `com.eca.template`
- source of truth for templates, versions, schema JSON, and export metadata

### Submission
- package root: `com.eca.submission`
- sibling feature area, not nested under template
- depends on template/version persistence data as source of truth

## Submission Backend Responsibilities

- workbook identify endpoint
- workbook validation endpoint
- manual fallback validation against latest template version
- minimal validated submission persistence
- read-only history endpoint
- read-only details endpoint

## Current Backend Boundaries

- no approval/workflow engine
- no correction/edit subsystem
- no row-data persistence
- no validation blob persistence
- no manual version selector for fallback

## Key Submission Services

- `SubmissionService`
- `SubmissionStructureValidationService`
- `SubmissionPersistenceService`
- `SubmissionHistoryService`
- `SubmissionWorkbookParser`

## Persistence

- template/version state remains in template tables
- minimal submission records are stored in `submissions`
- Flyway manages schema evolution
