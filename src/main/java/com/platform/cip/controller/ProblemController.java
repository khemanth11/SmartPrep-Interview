package com.platform.cip.controller;

import com.platform.cip.document.Problem;
import com.platform.cip.dto.ProblemResponse;
import com.platform.cip.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    // Admin endpoint to add new coding questions
    @PostMapping
    public ResponseEntity<Problem> createProblem(@RequestBody Problem problem) {
        return ResponseEntity.ok(problemService.createProblem(problem));
    }

    // Public endpoint for users to browse problems list
    @GetMapping
    public ResponseEntity<List<ProblemResponse>> getAllProblems() {
        return ResponseEntity.ok(problemService.getAllProblemsSafe());
    }

    // Public endpoint to load a specific problem in the editor workspace
    @GetMapping("/{id}")
    public ResponseEntity<ProblemResponse> getProblemById(@PathVariable String id) {
        return ResponseEntity.ok(problemService.getProblemByIdSafe(id));
    }
}
