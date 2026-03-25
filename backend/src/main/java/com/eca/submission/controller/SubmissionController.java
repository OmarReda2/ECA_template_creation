package com.eca.submission.controller;

import com.eca.submission.dto.SubmissionIdentifyResponse;
import com.eca.submission.dto.SubmissionStructureValidationResponse;
import com.eca.submission.exception.SubmissionWorkbookException;
import com.eca.submission.model.SubmissionIdentifyStatus;
import com.eca.submission.service.SubmissionService;
import com.eca.submission.service.SubmissionStructureValidationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(SubmissionController.class);
    private final SubmissionService submissionService;
    private final SubmissionStructureValidationService structureValidationService;

    public SubmissionController(
            SubmissionService submissionService,
            SubmissionStructureValidationService structureValidationService
    ) {
        this.submissionService = submissionService;
        this.structureValidationService = structureValidationService;
    }

    @PostMapping("/identify")
    public SubmissionIdentifyResponse identify(@RequestPart("file") MultipartFile file) {
        return submissionService.identify(file);
    }

    @PostMapping("/validate-structure")
    public SubmissionStructureValidationResponse validateStructure(@RequestPart("file") MultipartFile file) {
        log.info("validateStructure called filename={} size={}", file != null ? file.getOriginalFilename() : null, file != null ? file.getSize() : null);
        return structureValidationService.validateStructure(file);
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
