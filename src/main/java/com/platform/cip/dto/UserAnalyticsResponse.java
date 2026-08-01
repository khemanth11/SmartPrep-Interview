package com.platform.cip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAnalyticsResponse {
    private int totalProblemsSolved;
    private int easySolved;
    private int mediumSolved;
    private int hardSolved;
    private int totalSubmissions;

    private int averageCommunicationScore;
    private int averageDomainKnowledgeScore;
    private int completedInterviewsCount;

    private int googleReadinessScore;
    private int amazonReadinessScore;
    private int microsoftReadinessScore;
}
