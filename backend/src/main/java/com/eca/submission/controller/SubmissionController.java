package com.eca.submission.controller;

import com.eca.submission.dto.SubmissionDetailsDto;
import com.eca.submission.dto.SubmissionHistoryItemDto;
import com.eca.submission.dto.SubmissionIdentifyResponse;
import com.eca.submission.dto.SubmissionStructureValidationResponse;
import com.eca.submission.exception.SubmissionWorkbookException;
import com.eca.submission.model.SubmissionIdentifyStatus;
import com.eca.submission.service.SubmissionHistoryService;
import com.eca.submission.service.SubmissionService;
import com.eca.submission.service.SubmissionStructureValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SubmissionStructureValidationService structureValidationService;
    private final SubmissionHistoryService submissionHistoryService;

    public SubmissionController(
            SubmissionService submissionService,
            SubmissionStructureValidationService structureValidationService,
            SubmissionHistoryService submissionHistoryService
    ) {
        this.submissionService = submissionService;
        this.structureValidationService = structureValidationService;
        this.submissionHistoryService = submissionHistoryService;
    }

    @GetMapping
    public List<SubmissionHistoryItemDto> listSubmissions() {
        return submissionHistoryService.listSubmissions();
    }

    @GetMapping("/{id}")
    public SubmissionDetailsDto getSubmission(@PathVariable UUID id) {
        return submissionHistoryService.getSubmission(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found."));
    }

    @PostMapping("/identify")
    public SubmissionIdentifyResponse identify(@RequestPart("file") MultipartFile file) {
        return submissionService.identify(file);
    }

    @PostMapping("/validate")
    public SubmissionStructureValidationResponse validateStructure(@RequestPart("file") MultipartFile file) {
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
