package com.eca.submission.exception;

import com.eca.submission.model.SubmissionIdentifyStatus;

public class SubmissionWorkbookException extends RuntimeException {

    private final SubmissionIdentifyStatus status;

    public SubmissionWorkbookException(SubmissionIdentifyStatus status, String message) {
        super(message);
        this.status = status;
    }

    public SubmissionIdentifyStatus getStatus() {
        return status;
    }
}
