package com.platform.cip.service;

import com.platform.cip.document.Submission;
import com.platform.cip.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final UserProgressService userProgressService;

    public Submission recordSubmission(String userId, String problemId, String code, String language,
            String status, int passedCount, int totalCount) {
        Submission submission = Submission.builder()
                .userId(userId)
                .problemId(problemId)
                .code(code)
                .language(language)
                .status(status)
                .passedCount(passedCount)
                .totalCount(totalCount)
                .submittedAt(LocalDateTime.now())
                .build();
        Submission saved = submissionRepository.save(submission);
        if ("ACCEPTED".equalsIgnoreCase(status)) {
            userProgressService.markProblemCompleted(userId, problemId);
        }
        return saved;
    }

    public List<Submission> getSubmissionsForProblem(String userId, String problemId) {
        return submissionRepository.findByUserIdAndProblemIdOrderBySubmittedAtDesc(userId, problemId);
    }

    public Submission getLatestSubmission(String userId, String problemId) {
        List<Submission> submissions = submissionRepository.findByUserIdAndProblemIdOrderBySubmittedAtDesc(userId,
                problemId);
        if (submissions.isEmpty()) {
            return null;
        }
        return submissions.get(0);
    }

    public Map<String, String> getSolveStatusesForUser(String userId) {
        List<Submission> submissions = submissionRepository.findByUserId(userId);
        Map<String, String> statuses = new HashMap<>();

        for (Submission sub : submissions) {
            String currentStatus = statuses.get(sub.getProblemId());
            if ("SOLVED".equals(currentStatus)) {
                continue;
            }
            if ("ACCEPTED".equalsIgnoreCase(sub.getStatus())) {
                statuses.put(sub.getProblemId(), "SOLVED");
            } else {
                statuses.put(sub.getProblemId(), "ATTEMPTED");
            }
        }
        return statuses;
    }
}
