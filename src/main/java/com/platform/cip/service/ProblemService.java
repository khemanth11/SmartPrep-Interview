package com.platform.cip.service;

import com.platform.cip.document.Problem;
import com.platform.cip.dto.ProblemResponse;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;

    // Creates a new problem in the database (Admin/Developer endpoint)
    public Problem createProblem(Problem problem) {
        if (problemRepository.existsByTitle(problem.getTitle())) {
            throw new IllegalArgumentException("Problem with this title already exists.");
        }
        return problemRepository.save(problem);
    }

    // Fetches all problems, mapping them to safe responses (excluding hidden test
    // cases)
    public List<ProblemResponse> getAllProblemsSafe() {
        return problemRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Fetches a single problem by ID safely (excluding hidden test cases)
    public ProblemResponse getProblemByIdSafe(String id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found with ID: " + id));
        return convertToResponse(problem);
    }

    // Direct helper method used internally by the Code Executor (needs access to
    // hidden test cases)
    public Problem getRawProblem(String id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found with ID: " + id));
    }

    // Mapping helper to strip hidden test cases
    private ProblemResponse convertToResponse(Problem problem) {
        return ProblemResponse.builder()
                .id(problem.getId())
                .title(problem.getTitle())
                .description(problem.getDescription())
                .difficulty(problem.getDifficulty())
                .tags(problem.getTags())
                .inputFormat(problem.getInputFormat())
                .outputFormat(problem.getOutputFormat())
                .constraints(problem.getConstraints())
                .systemTemplate(problem.getSystemTemplate())
                .sampleTestCases(problem.getSampleTestCases())
                .build();
    }
}
