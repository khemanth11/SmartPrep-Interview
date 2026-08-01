package com.platform.cip.service;

import com.platform.cip.document.Difficulty;
import com.platform.cip.document.InterviewSession;
import com.platform.cip.document.Problem;
import com.platform.cip.dto.UserAnalyticsResponse;
import com.platform.cip.repository.InterviewSessionRepository;
import com.platform.cip.repository.ProblemRepository;
import com.platform.cip.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UserProgressService userProgressService;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final InterviewSessionRepository interviewSessionRepository;

    public UserAnalyticsResponse getUserAnalytics(String userId) {
        Set<String> completedIds = userProgressService.getCompletedProblemIds(userId);
        List<Problem> allProblems = problemRepository.findAll();

        int easySolved = 0;
        int mediumSolved = 0;
        int hardSolved = 0;

        for (Problem problem : allProblems) {
            if (completedIds.contains(problem.getId())) {
                if (problem.getDifficulty() == Difficulty.EASY) {
                    easySolved++;
                } else if (problem.getDifficulty() == Difficulty.HARD) {
                    hardSolved++;
                } else {
                    mediumSolved++;
                }
            }
        }

        int totalSolved = completedIds.size();
        int totalSubmissions = submissionRepository.findByUserId(userId).size();

        List<InterviewSession> sessions = interviewSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int totalComm = 0;
        int totalDomain = 0;
        int completedCount = 0;

        for (InterviewSession session : sessions) {
            if ("COMPLETED".equalsIgnoreCase(session.getStatus())) {
                totalComm += (session.getCommunicationScore() != null ? session.getCommunicationScore() : 0);
                totalDomain += (session.getDomainKnowledgeScore() != null ? session.getDomainKnowledgeScore() : 0);
                completedCount++;
            }
        }

        int avgComm = completedCount > 0 ? totalComm / completedCount : 0;
        int avgDomain = completedCount > 0 ? totalDomain / completedCount : 0;

        // Calculate company readiness scores based on solved problem ratios and interview performance
        int totalProblemsInDb = Math.max(1, allProblems.size());
        double solveRatio = (double) totalSolved / totalProblemsInDb;

        int googleScore = Math.min(100, (int) (solveRatio * 50 + (hardSolved * 15) + (mediumSolved * 5) + (avgDomain * 0.3)));
        int amazonScore = Math.min(100, (int) (solveRatio * 40 + (mediumSolved * 8) + (avgComm * 0.4)));
        int microsoftScore = Math.min(100, (int) (solveRatio * 60 + (easySolved * 5) + (mediumSolved * 5) + (avgDomain * 0.2)));

        return UserAnalyticsResponse.builder()
                .totalProblemsSolved(totalSolved)
                .easySolved(easySolved)
                .mediumSolved(mediumSolved)
                .hardSolved(hardSolved)
                .totalSubmissions(totalSubmissions)
                .averageCommunicationScore(avgComm)
                .averageDomainKnowledgeScore(avgDomain)
                .completedInterviewsCount(completedCount)
                .googleReadinessScore(googleScore)
                .amazonReadinessScore(amazonScore)
                .microsoftReadinessScore(microsoftScore)
                .build();
    }
}
