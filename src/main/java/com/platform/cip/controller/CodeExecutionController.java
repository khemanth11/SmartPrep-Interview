package com.platform.cip.controller;

import com.platform.cip.document.User;
import com.platform.cip.document.Submission;
import com.platform.cip.dto.CodeExecutionRequest;
import com.platform.cip.dto.TestCaseExecutionResult;
import com.platform.cip.service.CodeExecutionService;
import com.platform.cip.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/problems")
@RequiredArgsConstructor
public class CodeExecutionController {

    private final CodeExecutionService codeExecutionService;
    private final SubmissionService submissionService;

    @PostMapping("/{id}/run")
    public ResponseEntity<List<TestCaseExecutionResult>> runCode(
            @PathVariable String id,
            @RequestBody CodeExecutionRequest request) {
        List<TestCaseExecutionResult> results = codeExecutionService.runCode(id, request.getCode(),
                request.getLanguage(), false);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<List<TestCaseExecutionResult>> submitCode(
            @PathVariable String id,
            @RequestBody CodeExecutionRequest request,
            @AuthenticationPrincipal User user) {

        List<TestCaseExecutionResult> results = codeExecutionService.runCode(id, request.getCode(),
                request.getLanguage(), true);

        // Determine submission status
        String status = "ACCEPTED";
        int passedCount = 0;
        int totalCount = results.size();

        for (TestCaseExecutionResult res : results) {
            if (res.isPassed()) {
                passedCount++;
            } else {
                if (status.equals("ACCEPTED")) { // Capture the first failing status
                    if (res.getError() != null) {
                        if (res.getError().contains("Time Limit Exceeded")) {
                            status = "TIME_LIMIT_EXCEEDED";
                        } else if (res.getError().contains("Runtime") || res.getError().contains("Exception")) {
                            status = "RUNTIME_ERROR";
                        } else {
                            status = "COMPILE_ERROR";
                        }
                    } else {
                        status = "WRONG_ANSWER";
                    }
                }
            }
        }

        if (totalCount == 0) {
            status = "COMPILE_ERROR";
        }

        // Record to database
        submissionService.recordSubmission(
                user.getId(),
                id,
                request.getCode(),
                request.getLanguage(),
                status,
                passedCount,
                totalCount);

        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<Submission>> getSubmissions(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.getSubmissionsForProblem(user.getId(), id));
    }

    @GetMapping("/{id}/submissions/latest")
    public ResponseEntity<Submission> getLatestSubmission(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        Submission latest = submissionService.getLatestSubmission(user.getId(), id);
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(latest);
    }
}
