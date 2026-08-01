package com.platform.cip.service;

import com.platform.cip.document.UserProgress;
import com.platform.cip.repository.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserProgressService {

    private final UserProgressRepository userProgressRepository;

    public Set<String> getCompletedProblemIds(String userId) {
        if (userId == null) {
            return new HashSet<>();
        }
        Set<String> set = userProgressRepository.findByUserId(userId)
                .map(UserProgress::getCompletedProblemIds)
                .orElseGet(HashSet::new);
        return set != null ? set : new HashSet<>();
    }

    public boolean toggleProblemCompletion(String userId, String problemId) {
        UserProgress progress = userProgressRepository.findByUserId(userId)
                .orElseGet(() -> UserProgress.builder()
                        .userId(userId)
                        .completedProblemIds(new HashSet<>())
                        .build());

        Set<String> completed = progress.getCompletedProblemIds();
        if (completed == null) {
            completed = new HashSet<>();
            progress.setCompletedProblemIds(completed);
        }
        boolean nowCompleted;
        if (completed.contains(problemId)) {
            completed.remove(problemId);
            nowCompleted = false;
        } else {
            completed.add(problemId);
            nowCompleted = true;
        }

        userProgressRepository.save(progress);
        return nowCompleted;
    }

    public void markProblemCompleted(String userId, String problemId) {
        if (userId == null || problemId == null) {
            return;
        }
        UserProgress progress = userProgressRepository.findByUserId(userId)
                .orElseGet(() -> UserProgress.builder()
                        .userId(userId)
                        .completedProblemIds(new HashSet<>())
                        .build());

        if (progress.getCompletedProblemIds() == null) {
            progress.setCompletedProblemIds(new HashSet<>());
        }

        if (!progress.getCompletedProblemIds().contains(problemId)) {
            progress.getCompletedProblemIds().add(problemId);
            userProgressRepository.save(progress);
        }
    }
}
