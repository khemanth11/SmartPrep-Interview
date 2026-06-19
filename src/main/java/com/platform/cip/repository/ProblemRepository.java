package com.platform.cip.repository;

import com.platform.cip.document.Problem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProblemRepository extends MongoRepository<Problem, String> {
    Optional<Problem> findByTitle(String title);

    boolean existsByTitle(String title);
}
