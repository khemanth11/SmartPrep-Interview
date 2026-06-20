package com.platform.cip.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.cip.document.ChatMessage;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.*;

@SuppressWarnings("unused")
@Service
@RequiredArgsConstructor
public class GroqService {

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model}")
    private String modelName;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WebClient webClient;

    // Inner class representing structured evaluation response
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterviewEvaluation {
        private Integer communicationScore;
        private Integer domainKnowledgeScore;
        private String feedback;
    }

    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    /**
     * Streams the interviewer's response token-by-token using SSE.
     */
    public Flux<String> streamInterviewerResponse(List<ChatMessage> history, String role) {
        String systemPrompt = String.format(
                "You are an expert interviewer for the position of: %s. Conduct a highly realistic, professional, and challenging mock interview. "
                        +
                        "Ask one relevant behavioral or technical question at a time. React dynamically to the candidate's responses. "
                        +
                        "Keep your questions professional and role-specific. Do not provide explanations, cheat-codes, or self-dialogue. "
                        +
                        "Keep the questions challenging, as if they are interviewing for a 30 LPA role. " +
                        "If the candidate explicitly wants to end the interview, respond only with the tag: [INTERVIEW_OVER].",
                role);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        // Incorporate history into the request
        for (ChatMessage msg : history) {
            String msgRole = msg.getSender().equalsIgnoreCase("AI") ? "assistant" : "user";
            messages.add(Map.of("role", msgRole, "content", msg.getMessage()));
        }

        Map<String, Object> requestBody = Map.of(
                "model", modelName,
                "messages", messages,
                "stream", true);

        return webClient.post()
                .uri("/chat/completions")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> line.startsWith("data: "))
                .map(line -> line.substring(6).trim())
                .map(this::extractContentFromChunk)
                .filter(content -> !content.isEmpty());
    }

    /**
     * Evaluates the entire transcript synchronously, returning a structured
     * scorecard.
     */
    public InterviewEvaluation evaluateSession(List<ChatMessage> history, String role) {
        String systemPrompt = String.format(
                "You are a senior technical hiring manager reviewing a candidate's mock interview transcript for the position of: %s. "
                        +
                        "Analyze the dialogue and return a constructive, comprehensive scorecard in strict JSON format. "
                        +
                        "Do not write any introductory or explanatory text. Your entire response must be a single parseable JSON object matching this structure: "
                        +
                        "{\n" +
                        "  \"communicationScore\": <0-100 integer>,\n" +
                        "  \"domainKnowledgeScore\": <0-100 integer>,\n" +
                        "  \"feedback\": \"<Detailed strengths, weaknesses, and clear actionable points for improvement>\"\n"
                        +
                        "}",
                role);

        StringBuilder transcriptBuilder = new StringBuilder();
        for (ChatMessage msg : history) {
            transcriptBuilder.append(msg.getSender()).append(": ").append(msg.getMessage()).append("\n\n");
        }

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", "Review this transcript:\n" + transcriptBuilder.toString()));

        Map<String, Object> requestBody = Map.of(
                "model", modelName,
                "messages", messages,
                "stream", false);

        try {
            String rawJson = webClient.post()
                    .uri("/chat/completions")
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .map(this::extractContentFromFullResponse)
                    .block(); // Synchronous block for background execution evaluation

            String cleanedJson = cleanJsonString(rawJson);
            return objectMapper.readValue(cleanedJson, InterviewEvaluation.class);
        } catch (Exception e) {
            // Safe fallback if JSON parsing or connection fails
            return InterviewEvaluation.builder()
                    .communicationScore(50)
                    .domainKnowledgeScore(50)
                    .feedback("Error compiling automated AI feedback. Please try again. Technical details: "
                            + e.getMessage())
                    .build();
        }
    }

    // Helper to parse streamed tokens from JSON
    private String extractContentFromChunk(String chunk) {
        try {
            if (chunk.equals("[DONE]")) {
                return "";
            }
            JsonNode rootNode = objectMapper.readTree(chunk);
            JsonNode choicesNode = rootNode.path("choices");
            if (choicesNode.isArray() && choicesNode.size() > 0) {
                JsonNode deltaNode = choicesNode.get(0).path("delta");
                if (deltaNode.has("content")) {
                    return deltaNode.get("content").asText();
                }
            }
        } catch (Exception e) {
            // Ignore parsing errors for malformed or empty lines
        }
        return "";
    }

    // Helper to parse non-streamed full responses
    private String extractContentFromFullResponse(String response) {
        try {
            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode choicesNode = rootNode.path("choices");
            if (choicesNode.isArray() && choicesNode.size() > 0) {
                JsonNode messageNode = choicesNode.get(0).path("message");
                if (messageNode.has("content")) {
                    return messageNode.get("content").asText();
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return "";
    }

    // Helper to clean Markdown tags from LLM responses (e.g., ```json ... ```)
    private String cleanJsonString(String rawJson) {
        if (rawJson == null)
            return "";
        String cleaned = rawJson.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
