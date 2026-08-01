package com.platform.cip.service;

import com.platform.cip.document.Problem;
import com.platform.cip.document.TestCase;
import com.platform.cip.dto.TestCaseExecutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CodeExecutionService {

    private final ProblemService problemService;
    private final Judge0Service judge0Service;

    /**
     * Executes the submitted code against test cases.
     * 
     * @param problemId the target coding problem ID
     * @param code      the written solution text
     * @param language  "python", "javascript", "java", "cpp", "go", "rust"
     * @param useHidden true to run evaluation hidden cases, false for sample cases
     */
    public List<TestCaseExecutionResult> runCode(String problemId, String code, String language, boolean useHidden) {
        Problem problem = problemService.getRawProblem(problemId);
        List<TestCase> testCases = useHidden ? problem.getHiddenTestCases() : problem.getSampleTestCases();
        if (testCases == null) {
            testCases = new ArrayList<>();
        }

        String fullExecutionCode = code;
        String langLower = language == null ? "python" : language.toLowerCase().trim();

        if (langLower.contains("python") || langLower.equals("py")) {
            String driver = problem.getDriverCode();
            if (driver != null && !driver.trim().isEmpty()) {
                fullExecutionCode = code + "\n\n" + driver;
            }
        } else if (langLower.contains("js") || langLower.contains("javascript")) {
            String driver = problem.getJsDriverCode();
            if (driver != null && !driver.trim().isEmpty()) {
                fullExecutionCode = code + "\n\n" + driver;
            }
        } else if (langLower.contains("java")) {
            String driver = problem.getJavaDriverCode();
            if (driver != null && !driver.trim().isEmpty()) {
                fullExecutionCode = code + "\n\n" + driver;
            }
        } else if (langLower.contains("cpp") || langLower.contains("c++")) {
            String driver = problem.getCppDriverCode();
            if (driver != null && !driver.trim().isEmpty()) {
                fullExecutionCode = code + "\n\n" + driver;
            }
        } else if (langLower.contains("go")) {
            String driver = problem.getGoDriverCode();
            if (driver != null && !driver.trim().isEmpty()) {
                fullExecutionCode = code + "\n\n" + driver;
            }
        }

        List<TestCaseExecutionResult> results = new ArrayList<>();
        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            if (judge0Service.isEnabled()) {
                results.add(judge0Service.execute(fullExecutionCode, langLower, tc.getInput(), tc.getOutput(), i + 1));
            } else {
                results.add(executeSingleTestCaseLocal(fullExecutionCode, langLower, tc.getInput(), tc.getOutput(), i + 1));
            }
        }
        return results;
    }

    private TestCaseExecutionResult executeSingleTestCaseLocal(String code, String language, String input,
            String expectedOutput, int index) {
        String tempFileName = "Temp_" + UUID.randomUUID().toString().replace("-", "");
        String extension = getFileExtension(language);
        File tempFile = null;
        long startTime = System.currentTimeMillis();

        try {
            tempFile = File.createTempFile(tempFileName, extension);
            try (FileWriter writer = new FileWriter(tempFile)) {
                writer.write(code);
            }

            ProcessBuilder pb;
            if (language.contains("python") || language.equals("py")) {
                pb = new ProcessBuilder("python", tempFile.getAbsolutePath());
            } else if (language.contains("java")) {
                pb = new ProcessBuilder("java", tempFile.getAbsolutePath());
            } else {
                pb = new ProcessBuilder("node", tempFile.getAbsolutePath());
            }

            Process process = pb.start();

            if (input != null && !input.isEmpty()) {
                try (java.io.OutputStream os = process.getOutputStream()) {
                    os.write(input.getBytes());
                    os.flush();
                }
            }

            boolean finished = process.waitFor(5, TimeUnit.SECONDS);
            long elapsedTime = System.currentTimeMillis() - startTime;

            if (!finished) {
                process.destroyForcibly();
                return TestCaseExecutionResult.builder()
                        .testCaseIndex(index)
                        .passed(false)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .actualOutput("")
                        .error("Time Limit Exceeded (Timeout of 5s reached)")
                        .elapsedTimeMs(elapsedTime)
                        .build();
            }

            String output = new String(process.getInputStream().readAllBytes()).trim();
            String error = new String(process.getErrorStream().readAllBytes()).trim();

            if (process.exitValue() != 0) {
                return TestCaseExecutionResult.builder()
                        .testCaseIndex(index)
                        .passed(false)
                        .input(input)
                        .expectedOutput(expectedOutput)
                        .actualOutput(output)
                        .error(error.isEmpty() ? "Runtime Error (Exit Code: " + process.exitValue() + ")" : error)
                        .elapsedTimeMs(elapsedTime)
                        .build();
            }

            boolean passed = expectedOutput != null && output.equals(expectedOutput.trim());
            return TestCaseExecutionResult.builder()
                    .testCaseIndex(index)
                    .passed(passed)
                    .input(input)
                    .expectedOutput(expectedOutput)
                    .actualOutput(output)
                    .error(error.isEmpty() ? null : error)
                    .elapsedTimeMs(elapsedTime)
                    .build();

        } catch (IOException | InterruptedException e) {
            return TestCaseExecutionResult.builder()
                    .testCaseIndex(index)
                    .passed(false)
                    .input(input)
                    .expectedOutput(expectedOutput)
                    .actualOutput("")
                    .error("Execution Exception: " + e.getMessage())
                    .elapsedTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
            }
        }
    }

    private String getFileExtension(String language) {
        if (language == null) return ".py";
        switch (language.toLowerCase()) {
            case "java": return ".java";
            case "cpp": case "c++": return ".cpp";
            case "go": return ".go";
            case "rust": return ".rs";
            case "javascript": case "js": return ".js";
            default: return ".py";
        }
    }
}
