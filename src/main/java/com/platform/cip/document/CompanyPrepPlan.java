package com.platform.cip.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "company_prep_plans")
public class CompanyPrepPlan {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String companyName;
    private String role;
    private String examDate;
    private String jobDescription;
    private String aiStrategySummary;

    @Builder.Default
    private List<RankedProblem> prioritizedProblems = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RankedProblem {
        private int priorityRank;
        private String problemId;
        private String title;
        private String difficulty;
        private String category;
        private String reason;
        private boolean completed;
    }
}
