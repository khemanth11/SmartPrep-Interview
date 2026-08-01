package com.platform.cip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCaseExecutionResult {
    private int testCaseIndex;
    private boolean passed;
    private String input;
    private String expectedOutput;
    private String actualOutput;
    private String error;
    private long elapsedTimeMs;
}
