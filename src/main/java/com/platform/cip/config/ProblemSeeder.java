package com.platform.cip.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.cip.document.Problem;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProblemSeeder implements CommandLineRunner {

        private final ProblemRepository problemRepository;
        private final ObjectMapper objectMapper;

        @Override
        public void run(String... args) {
                try {
                        ClassPathResource resource = new ClassPathResource("problems_dataset.json");
                        if (!resource.exists()) {
                                log.warn("⚠️ problems_dataset.json not found in classpath. Skipping auto-seeding.");
                                return;
                        }

                        try (InputStream inputStream = resource.getInputStream()) {
                                List<Problem> datasetProblems = objectMapper.readValue(
                                                inputStream,
                                                new TypeReference<List<Problem>>() {
                                                });

                                int seededCount = 0;
                                for (Problem problem : datasetProblems) {
                                        // Check if problem already exists by title to maintain idempotency
                                        if (!problemRepository.existsByTitle(problem.getTitle())) {
                                                problemRepository.save(problem);
                                                seededCount++;
                                        }
                                }

                                log.info("✅ Problem Seeder finished. Ingested {} new problems (Total in DB: {}).",
                                                seededCount, problemRepository.count());
                        }
                } catch (Exception e) {
                        log.error("❌ Failed to seed problems from dataset: {}", e.getMessage(), e);
                }
        }
}
