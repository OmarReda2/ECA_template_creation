package com.eca.template.submission.model;

public enum SubmissionIdentifyStatus {
    EXACT_MATCH,
    METADATA_MISSING,
    METADATA_INVALID,
    VERSION_NOT_FOUND,
    HASH_MISMATCH,
    UNSUPPORTED_FILE
}
