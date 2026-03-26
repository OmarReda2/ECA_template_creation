# Architecture (Current MVP)

## System Style

The application is a **modular monolith** with a **layered / n-tier backend** and a feature-organized frontend.

## Backend Structure

### Template Feature
- package root: `com.eca.template`
- owns template, version, schema, and export behavior

### Submission Feature
- package root: `com.eca.submission`
- owns identify, validation, minimal persistence, and read-only history/details
- depends on template/version data as the validation source of truth

### Backend Layers
- controllers: HTTP entry points
- services: business logic
- repositories: persistence access
- entities: database mapping

## Frontend Structure

### App Entry
- landing page route: `/`
- app shell contains sidebar + top bar + outlet layout

### Template Feature
- list, details, create flow, schema editing, export

### Submission Feature
- wizard shell with explicit step state
- Step 1: Upload & Identify
- Step 2: Validate & Review Results
- Step 3: Review / Restart
- read-only history page
- read-only details page

## Current Submission Responsibilities

- parse uploaded workbook metadata
- resolve workbook identity automatically using `version_id`
- compare `schema_hash`
- support explicit manual fallback validation against the latest version of a selected template
- validate workbook structure and row/cell content
- persist minimal validated submission metadata
- expose read-only submission history and details

## Current Submission Persistence Scope

Saved submissions contain:
- `id`
- `templateId`
- `versionId`
- `schemaHash`
- `status`
- `createdAt`
- optional `originalFileName`

They do not contain:
- row data
- validation blobs
- workflow state

## App Navigation

The landing page is now a first-class app entry in navigation.

Primary destinations:
- Home
- Templates
- Create Template
- Submit Data
- Submission History

## Not Yet Implemented

- approval workflow
- correction/edit grid
- manual version selection for fallback
- re-validation from history/details
- row-data persistence
- validation blob persistence
