package com.platform.cip.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.cip.dto.TestCaseExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class Judge0Service {

    @Value("${judge0.api.url:https://judge0-ce.p.rapidapi.com}")
    private String judge0ApiUrl;

    @Value("${judge0.api.key:}")
    private String judge0ApiKey;

    @Value("${judge0.api.enabled:false}")
    private boolean enabled;

    private final ObjectMapper objectMapper;

    public boolean isEnabled() {
        return enabled && judge0ApiUrl != null && !judge0ApiUrl.trim().isEmpty();
    }

    /**
     * Map programming language strings to Judge0 Language IDs
     */
    public int getLanguageId(String language) {
        if (language == null) return 71; // default Python
        switch (language.toLowerCase().trim()) {
            case "python":
            case "py":
                return 71; // Python (3.8.1)
            case "javascript":
            case "js":
            case "node":
                return 63; // JavaScript (Node.js 12.14.0)
            case "java":
                return 62; // Java (OpenJDK 13.0.1)
            case "cpp":
            case "c++":
                return 54; // C++ (GCC 9.2.0)
            case "c":
                return 50; // C (GCC 9.2.0)
            case "go":
            case "golang":
                return 60; // Go (1.13.5)
            case "rust":
                return 73; // Rust (1.40.0)
            default:
                return 71;
        }
    }

    public TestCaseExecutionResult execute(String code, String language, String input, String expectedOutput, int index) {
        long startTime = System.currentTimeMillis();
        try {
            int languageId = getLanguageId(language);
            WebClient webClient = WebClient.create(judge0ApiUrl);

            Map<String, Object> body = new HashMap<>();
            body.put("source_code", code);
            body.put("language_id", languageId);
            if (input != null && !input.isEmpty()) {
                body.put("stdin", input);
            }
            if (expectedOutput != null && !expectedOutput.isEmpty()) {
                body.put("expected_output", expectedOutput);
            }

            WebClient.RequestHeadersSpec<?> request = webClient.post()
                    .uri("/submissions?wait=true&fields=stdout,stderr,status_id,status,compile_output,time,memory")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body);

            if (judge0ApiKey != null && !judge0ApiKey.trim().isEmpty()) {
                request = request.header("X-RapidAPI-Key", judge0ApiKey)
                        .header("X-RapidAPI-Host", "judge0-ce.p.rapidapi.com");
            }

            Map<?, ?> response = request.retrieve()
                    .bodyToMono(Map.class)
                    .block();

            long elapsedTime = System.currentTimeMillis() - startTime;

            if (response == null) {
                return TestCaseExecutionResult.builder()
                        .testCaseIndex(index)
                        .passed(false)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .actualOutput("")
                        .error("Judge0 API Returned Null Response")
                        .elapsedTimeMs(elapsedTime)
                        .build();
            }

            String stdout = response.get("stdout") != null ? response.get("stdout").toString().trim() : "";
            String stderr = response.get("stderr") != null ? response.get("stderr").toString().trim() : "";
            String compileOutput = response.get("compile_output") != null ? response.get("compile_output").toString().trim() : "";
            
            Map<?, ?> status = (Map<?, ?>) response.get("status");
            int statusId = status != null && status.get("id") != null ? Integer.parseInt(status.get("id").toString()) : 0;
            String statusDesc = status != null && status.get("description") != null ? status.get("description").toString() : "Unknown";

            boolean passed = statusId == 3;
            String errorMsg = null;
            if (!passed) {
                if (statusId == 6) {
                    errorMsg = compileOutput.isEmpty() ? "Compilation Error" : compileOutput;
                } else if (statusId == 5) {
                    errorMsg = "Time Limit Exceeded";
                } else if (!stderr.isEmpty()) {
                    errorMsg = stderr;
                } else {
                    errorMsg = statusDesc;
                }
            }

            return TestCaseExecutionResult.builder()
                    .testCaseIndex(index)
                    .passed(passed)
                    .input(input)
                    .expectedOutput(expectedOutput)
                    .actualOutput(stdout)
                    .error(errorMsg)
                    .elapsedTimeMs(elapsedTime)
                    .build();

        } catch (Exception e) {
            log.error("Judge0 execution failed: {}", e.getMessage(), e);
            return TestCaseExecutionResult.builder()
                    .testCaseIndex(index)
                    .passed(false)
                    .input(input)
                    .expectedOutput(expectedOutput)
                    .actualOutput("")
                    .error("Judge0 API Error: " + e.getMessage())
                    .elapsedTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }
}
