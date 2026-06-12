# Decisions (v1 — Verified)

## Decision 1: Architecture Change
The system was migrated from Clean Architecture to Layered Architecture.

Reason:
- Simpler system scope
- Reduced complexity

---

## Decision 2: Version Created on Template Creation
Every template creation automatically creates version 1.

Observed behavior:
- TemplateService creates both TemplateEntity and TemplateVersionEntity

---

## Decision 3: JSON-Based Schema
Schema is stored as JSON (JSONB) instead of relational tables.

Observed behavior:
- schemaJson field exists in TemplateVersionEntity


---

## Decision 4: Submission Identity Strategy (MVP)

Identity resolution is based on:

- Primary: `version_id`
- Required match: `schema_hash`
- Advisory: `template_id`, `version_number`

Reason:
- Simplifies MVP implementation
- Avoids ambiguity in template/version selection
- Prevents hidden fallback behavior

Fallback:
- Manual template selection (frontend only)
- Uses latest version (MVP simplification)