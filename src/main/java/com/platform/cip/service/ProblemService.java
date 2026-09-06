package com.platform.cip.service;

import com.platform.cip.document.Problem;
import com.platform.cip.dto.GenerateProblemRequest;
import com.platform.cip.dto.ProblemResponse;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final SubmissionService submissionService;
    private final UserProgressService userProgressService;
    private final GroqService groqService;

    // Creates a new problem in the database (Admin/Developer endpoint)
    public Problem createProblem(Problem problem) {
        if (problemRepository.existsByTitle(problem.getTitle())) {
            throw new IllegalArgumentException("Problem with this title already exists.");
        }
        return problemRepository.save(problem);
    }

    // AI On-Demand Problem Generator
    public ProblemResponse generateAndSaveProblem(GenerateProblemRequest request, String userId) {
        Problem generated = groqService.generateCustomProblem(
                request.getTopic(),
                request.getDifficulty(),
                request.getCompany()
        );

        // If title collision occurs, append a unique suffix
        if (problemRepository.existsByTitle(generated.getTitle())) {
            generated.setTitle(generated.getTitle() + " (" + System.currentTimeMillis() % 10000 + ")");
        }

        Problem saved = problemRepository.save(generated);
        return convertToResponse(saved, "UNSOLVED", false);
    }

    // Fetches all problems, mapping them to safe responses and attaching solveStatus and isCompleted
    public List<ProblemResponse> getAllProblemsSafe(String userId) {
        Map<String, String> solveStatuses = submissionService.getSolveStatusesForUser(userId);
        java.util.Set<String> completedIds = userProgressService.getCompletedProblemIds(userId);
        return problemRepository.findAll().stream()
                .map(problem -> {
                    String status = solveStatuses.getOrDefault(problem.getId(), "UNSOLVED");
                    boolean isCompleted = "SOLVED".equalsIgnoreCase(status) || "ACCEPTED".equalsIgnoreCase(status)
                            || (completedIds != null && completedIds.contains(problem.getId()));
                    return convertToResponse(problem, status, isCompleted);
                })
                .collect(Collectors.toList());
    }

    // Fetches a single problem by ID safely
    public ProblemResponse getProblemByIdSafe(String id, String userId) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found with ID: " + id));
        Map<String, String> solveStatuses = submissionService.getSolveStatusesForUser(userId);
        java.util.Set<String> completedIds = userProgressService.getCompletedProblemIds(userId);
        String status = solveStatuses.getOrDefault(id, "UNSOLVED");
        boolean isCompleted = "SOLVED".equalsIgnoreCase(status) || "ACCEPTED".equalsIgnoreCase(status)
                || (completedIds != null && completedIds.contains(id));
        return convertToResponse(problem, status, isCompleted);
    }

    // Direct helper method used internally by Code Executor (needs access to hidden test cases)
    public Problem getRawProblem(String id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found with ID: " + id));
    }

    // Mapping helper to strip hidden test cases
    private ProblemResponse convertToResponse(Problem problem, String solveStatus, boolean isCompleted) {
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
                .jsTemplate(problem.getJsTemplate())
                .javaTemplate(problem.getJavaTemplate())
                .cppTemplate(problem.getCppTemplate())
                .goTemplate(problem.getGoTemplate())
                .sampleTestCases(problem.getSampleTestCases())
                .solveStatus(solveStatus)
                .category(problem.getCategory())
                .moduleOrder(problem.getModuleOrder())
                .isCompleted(isCompleted)
                .build();
    }
}
