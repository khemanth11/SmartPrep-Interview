package com.platform.cip.controller;

import com.platform.cip.document.InterviewSession;
import com.platform.cip.document.User;
import com.platform.cip.dto.InterviewSessionRequest;
import com.platform.cip.service.InterviewSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
public class InterviewSessionController {
    private final InterviewSessionService interviewSessionService;

    // starts new interview for the logged in user
    @PostMapping
    public ResponseEntity<InterviewSession> createSession(
            @RequestBody @Valid InterviewSessionRequest request,
            @AuthenticationPrincipal User user) {
        InterviewSession session = interviewSessionService.createSession(user.getId(), request.getRole(),
                request.getProblemId());
        return ResponseEntity.ok(session);
    }

    // Getting all the interview session for the logged in users
    @GetMapping
    public ResponseEntity<List<InterviewSession>> getSessionHistory(
            @AuthenticationPrincipal User user) {
        List<InterviewSession> history = interviewSessionService.getSessionHistory(user.getId());
        return ResponseEntity.ok(history);
    }

    // gets details of specific interview session
    @GetMapping("/{id}")
    public ResponseEntity<InterviewSession> getSessionById(
            @PathVariable String id,
            @AuthenticationPrincipal User user) {
        InterviewSession session = interviewSessionService.getSessionById(id, user.getId());
        return ResponseEntity.ok(session);
    }
}
