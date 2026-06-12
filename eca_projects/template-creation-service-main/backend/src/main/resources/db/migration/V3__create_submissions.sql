CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    version_id UUID NOT NULL,
    schema_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    original_file_name TEXT
);

CREATE INDEX idx_submissions_template_id ON submissions(template_id);
CREATE INDEX idx_submissions_version_id ON submissions(version_id);
