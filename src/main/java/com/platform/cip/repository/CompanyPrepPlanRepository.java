package com.platform.cip.repository;

import com.platform.cip.document.CompanyPrepPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface CompanyPrepPlanRepository extends MongoRepository<CompanyPrepPlan, String> {
    List<CompanyPrepPlan> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<CompanyPrepPlan> findFirstByUserIdOrderByCreatedAtDesc(String userId);
}
