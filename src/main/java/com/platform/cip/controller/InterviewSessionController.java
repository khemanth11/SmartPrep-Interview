package com.platform.cip.controller;

import com.platform.cip.document.InterviewSession;
import com.platform.cip.document.User;
import com.platform.cip.dto.InterviewSessionRequest;
import com.platform.cip.service.InterviewSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
public class InterviewSessionController {
    private final InterviewSessionService interviewSessionService;

    // Starts a new interview for the logged-in user
    @PostMapping
    public ResponseEntity<InterviewSession> createSession(
            @RequestBody @Valid InterviewSessionRequest request,
            @AuthenticationPrincipal User user) {
        InterviewSession session = interviewSessionService.createSession(
                user.getId(),
                request.getRole(),
                request.getProblemId(),
                request.getResumeText());
        return ResponseEntity.ok(session);
    }

    // Getting all the interview sessions for the logged-in user
    @GetMapping
    public ResponseEntity<List<InterviewSession>> getSessionHistory(
            @AuthenticationPrincipal User user) {
        List<InterviewSession> history = interviewSessionService.getSessionHistory(user.getId());
        return ResponseEntity.ok(history);
    }

    // Gets details of a specific interview session
    @GetMapping("/{id}")
    public ResponseEntity<InterviewSession> getSessionById(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        InterviewSession session = interviewSessionService.getSessionById(id, user.getId());
        return ResponseEntity.ok(session);
    }

    // Helper helper to match the exact service method name
    private InterviewSession getSessionByIdHelper(String id, String userId) {
        return interviewSessionService.getSessionById(id, userId);
    }

    // Overriding the previous mapping helper for safety
    @GetMapping("/{id}/details")
    public ResponseEntity<InterviewSession> getSessionDetails(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(getSessionByIdHelper(id, user.getId()));
    }

    /**
     * Sends user message to the session and streams back the AI's question
     * dynamically using SSE.
     */
    @PostMapping(value = "/{id}/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(
            @PathVariable String id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal User user) {
        String userMsg = payload.get("message");
        if (userMsg == null || userMsg.trim().isEmpty()) {
            return Flux.just("Error: Message payload cannot be empty.");
        }
        return interviewSessionService.streamChat(id, userMsg, user.getId());
    }

    /**
     * Ends the interview and triggers evaluation. Returns the final scorecard
     * details.
     */
    @PostMapping("/{id}/end")
    public ResponseEntity<InterviewSession> evaluateSession(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        InterviewSession session = interviewSessionService.evaluateSession(id, user.getId());
        return ResponseEntity.ok(session);
    }

    @PostMapping(value = "/parse-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> parseResume(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            String filename = file.getOriginalFilename();
            String extractedText = "";
            if (filename != null && filename.toLowerCase().endsWith(".pdf")) {
                try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader
                        .loadPDF(file.getBytes())) {
                    org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                    extractedText = stripper.getText(document);
                }
            } else if (filename != null && filename.toLowerCase().endsWith(".txt")) {
                extractedText = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Unsupported file type. Please upload a PDF or TXT file."));
            }
            return ResponseEntity.ok(Map.of("text", extractedText));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to parse file: " + e.getMessage()));
        }
    }

}
