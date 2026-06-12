-- Slice 1: persistence layer for templates and template_versions (schema-registry style).
-- UUID strategy: app-generated (JPA GenerationType.UUID). No DB default on id columns.
DROP TABLE IF EXISTS template_version;
DROP TABLE IF EXISTS template;

CREATE TABLE templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    sector_code TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by TEXT NOT NULL
);

CREATE TABLE template_versions (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    status TEXT NOT NULL,
    schema_json JSONB NOT NULL,
    schema_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by TEXT NOT NULL,
    CONSTRAINT uq_template_version_number UNIQUE (template_id, version_number)
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_schema_hash ON template_versions(schema_hash);
