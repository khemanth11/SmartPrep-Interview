package com.platform.cip.repository;

import com.platform.cip.document.InterviewSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends MongoRepository<InterviewSession, String> {
    // Finds all sessions belonging to a user
    List<InterviewSession> findByUserId(String userId);

    // Finds all active sessions for a user (status is typically "IN_PROGRESS")
    List<InterviewSession> findByUserIdAndStatus(String userId, String status);
}
