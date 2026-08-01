package com.platform.cip.controller;

import com.platform.cip.document.Problem;
import com.platform.cip.document.User;
import com.platform.cip.dto.ProblemResponse;
import com.platform.cip.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;
    private final com.platform.cip.service.UserProgressService userProgressService;

    // Admin endpoint to add new coding questions
    @PostMapping
    public ResponseEntity<Problem> createProblem(@RequestBody Problem problem) {
        return ResponseEntity.ok(problemService.createProblem(problem));
    }

    // Public endpoint for users to browse problems list
    @GetMapping
    public ResponseEntity<List<ProblemResponse>> getAllProblems(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(problemService.getAllProblemsSafe(user.getId()));
    }

    // Public endpoint to load a specific problem in the editor workspace
    @GetMapping("/{id}")
    public ResponseEntity<ProblemResponse> getProblemById(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(problemService.getProblemByIdSafe(id, user.getId()));
    }

    // Toggle manual problem completion checkbox for the logged-in user
    @PostMapping("/{id}/toggle-complete")
    public ResponseEntity<java.util.Map<String, Object>> toggleProblemComplete(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        boolean isCompleted = userProgressService.toggleProblemCompletion(user.getId(), id);
        return ResponseEntity.ok(java.util.Map.of("problemId", id, "isCompleted", isCompleted));
    }
}
