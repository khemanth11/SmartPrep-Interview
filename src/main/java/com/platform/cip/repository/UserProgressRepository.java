package com.platform.cip.repository;

import com.platform.cip.document.UserProgress;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserProgressRepository extends MongoRepository<UserProgress, String> {
    Optional<UserProgress> findByUserId(String userId);
}
