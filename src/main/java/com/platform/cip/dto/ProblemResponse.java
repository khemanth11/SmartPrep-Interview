package com.platform.cip.dto;

import com.platform.cip.document.Difficulty;
import com.platform.cip.document.TestCase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemResponse {
    private String id;
    private String title;
    private String description;
    private Difficulty difficulty;
    private List<String> tags;
    private String inputFormat;
    private String outputFormat;
    private String constraints;
    private String systemTemplate;
    private String jsTemplate;
    private List<TestCase> sampleTestCases;
    private String solveStatus;
    private String category;
    private int moduleOrder;
    private boolean isCompleted;
}
