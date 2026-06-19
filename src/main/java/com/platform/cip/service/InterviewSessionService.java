package com.platform.cip.service;

import com.platform.cip.document.InterviewSession;
import com.platform.cip.repository.InterviewSessionRepository;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final ProblemRepository problemRepository;

    // Starts a new interview session for a user
    public InterviewSession createSession(String userId, String role, String problemId) {
        // If a coding problem is linked, verify that the problem actually exists
        if (problemId != null && !problemId.trim().isEmpty()) {
            if (!problemRepository.existsById(problemId)) {
                throw new IllegalArgumentException("Problem not found with ID: " + problemId);
            }
        }

        InterviewSession session = InterviewSession.builder()
                .userId(userId)
                .role(role)
                .problemId(problemId)
                .status("IN_PROGRESS")
                .messages(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();

        return sessionRepository.save(session);
    }

    // Fetches all sessions for a specific user
    public List<InterviewSession> getSessionHistory(String userId) {
        return sessionRepository.findByUserId(userId);
    }

    // Fetches a single session by ID and secures it by checking ownership
    public InterviewSession getSessionById(String id, String userId) {
        InterviewSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Interview session not found with ID: " + id));

        // Enforce security boundaries to prevent horizontal privilege escalation
        if (!session.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized access to this interview session.");
        }

        return session;
    }
}
