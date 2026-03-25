package com.eca.template.submission.controller;

import com.eca.template.submission.dto.SubmissionIdentifyResponse;
import com.eca.template.submission.exception.SubmissionWorkbookException;
import com.eca.template.submission.model.SubmissionIdentifyStatus;
import com.eca.template.submission.service.SubmissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping("/identify")
    public SubmissionIdentifyResponse identify(@RequestPart("file") MultipartFile file) {
        return submissionService.identify(file);
    }

    @ExceptionHandler(SubmissionWorkbookException.class)
    public ResponseEntity<SubmissionIdentifyResponse> handleWorkbookException(SubmissionWorkbookException ex) {
        SubmissionIdentifyResponse response = new SubmissionIdentifyResponse(
                ex.getStatus(),
                null,
                null,
                List.of(ex.getMessage())
        );
        HttpStatus status = ex.getStatus() == SubmissionIdentifyStatus.UNSUPPORTED_FILE
                ? HttpStatus.BAD_REQUEST
                : HttpStatus.UNPROCESSABLE_ENTITY;
        return ResponseEntity.status(status).body(response);
    }
}
