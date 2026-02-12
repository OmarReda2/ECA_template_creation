-- Slice 0: minimal schema so app runs with Flyway + JPA validate.
CREATE TABLE template (
    id UUID PRIMARY KEY
);

CREATE TABLE template_version (
    id UUID PRIMARY KEY
);
