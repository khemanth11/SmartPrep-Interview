package com.platform.cip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateProblemRequest {
    private String topic;       // e.g., "Sliding Window", "Dynamic Programming", "Graph BFS"
    private String difficulty;  // e.g., "EASY", "MEDIUM", "HARD"
    private String company;     // e.g., "Google", "Amazon", "Meta", "General"
}
