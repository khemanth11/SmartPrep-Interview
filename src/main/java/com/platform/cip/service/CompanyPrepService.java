package com.platform.cip.service;

import com.platform.cip.document.CompanyPrepPlan;
import com.platform.cip.document.Difficulty;
import com.platform.cip.document.Problem;
import com.platform.cip.dto.CompanyPrepRequest;
import com.platform.cip.repository.CompanyPrepPlanRepository;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyPrepService {

    private final CompanyPrepPlanRepository companyPrepPlanRepository;
    private final ProblemRepository problemRepository;
    private final UserProgressService userProgressService;
    private final GroqService groqService;

    public CompanyPrepPlan generatePrepPlan(String userId, CompanyPrepRequest request) {
        List<Problem> availableProblems = new ArrayList<>(problemRepository.findAll());
        Set<String> completedProblemIds = userProgressService.getCompletedProblemIds(userId);

        String comp = request.getCompanyName() != null ? request.getCompanyName().toLowerCase() : "";
        String role = request.getRole() != null ? request.getRole().toLowerCase() : "";

        // Dynamically sort problems based on company focus profile
        availableProblems.sort(Comparator.comparingInt((Problem p) -> {
            int score = 0;
            String title = p.getTitle() != null ? p.getTitle().toLowerCase() : "";
            String cat = p.getCategory() != null ? p.getCategory().toLowerCase() : "";
            Difficulty diff = p.getDifficulty() != null ? p.getDifficulty() : Difficulty.EASY;

            // Company specific weightings
            if (comp.contains("cognizant") || comp.contains("tcs") || comp.contains("infosys") || comp.contains("wipro") || comp.contains("accenture")) {
                if (title.contains("palindrome") || title.contains("reverse") || title.contains("fizzbuzz")) score += 30;
                if (title.contains("two sum") || title.contains("parentheses")) score += 20;
                if (diff == Difficulty.EASY) score += 15;
            } else if (comp.contains("google") || comp.contains("meta") || comp.contains("uber")) {
                if (diff == Difficulty.HARD) score += 30;
                if (diff == Difficulty.MEDIUM) score += 20;
                if (cat.contains("array") || cat.contains("stack") || cat.contains("graph")) score += 10;
            } else if (comp.contains("amazon")) {
                if (title.contains("two sum") || title.contains("parentheses") || cat.contains("stack")) score += 30;
                if (diff == Difficulty.MEDIUM) score += 20;
            } else {
                if (diff == Difficulty.EASY) score += 10;
                if (diff == Difficulty.MEDIUM) score += 15;
            }
            return -score; // Descending score order
        }));

        List<CompanyPrepPlan.RankedProblem> rankedList = new ArrayList<>();
        int rank = 1;

        for (Problem problem : availableProblems) {
            String categoryName = problem.getCategory() != null ? problem.getCategory() : "Data Structures";
            String diffName = problem.getDifficulty() != null ? problem.getDifficulty().name() : "EASY";

            String reason;
            if (comp.contains("cognizant")) {
                reason = String.format("Frequently asked in Cognizant %s technical assessment. Tests core string/array logic.", request.getRole());
            } else if (comp.contains("amazon")) {
                reason = String.format("High-frequency Amazon Leadership & SDE problem. Frequently evaluated in online assessments.", request.getRole());
            } else if (comp.contains("google")) {
                reason = String.format("Matches Google L4 interview style. Evaluates optimal time & space complexity.", request.getRole());
            } else {
                reason = String.format("High-frequency %s challenge (%s). Core technical requirement for %s.", categoryName, diffName, request.getCompanyName());
            }

            boolean isCompleted = completedProblemIds.contains(problem.getId());

            rankedList.add(CompanyPrepPlan.RankedProblem.builder()
                    .priorityRank(rank++)
                    .problemId(problem.getId())
                    .title(problem.getTitle())
                    .difficulty(diffName)
                    .category(categoryName)
                    .reason(reason)
                    .completed(isCompleted)
                    .build());
        }

        // Call Groq LLM to generate custom AI strategy summary for this exact company & role
        String aiStrategySummary = groqService.generateCompanyStrategySummary(
                request.getCompanyName(),
                request.getRole(),
                request.getExamDate(),
                request.getJobDescription()
        );

        CompanyPrepPlan plan = CompanyPrepPlan.builder()
                .userId(userId)
                .companyName(request.getCompanyName())
                .role(request.getRole())
                .examDate(request.getExamDate())
                .jobDescription(request.getJobDescription())
                .aiStrategySummary(aiStrategySummary)
                .prioritizedProblems(rankedList)
                .build();

        return companyPrepPlanRepository.save(plan);
    }

    public CompanyPrepPlan getActivePrepPlan(String userId) {
        CompanyPrepPlan plan = companyPrepPlanRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        if (plan != null && plan.getPrioritizedProblems() != null) {
            Set<String> completedIds = userProgressService.getCompletedProblemIds(userId);
            for (CompanyPrepPlan.RankedProblem rp : plan.getPrioritizedProblems()) {
                rp.setCompleted(completedIds.contains(rp.getProblemId()));
            }
        }
        return plan;
    }
}
