package com.platform.cip.service;

import com.platform.cip.document.ChatMessage;
import com.platform.cip.document.InterviewSession;
import com.platform.cip.repository.InterviewSessionRepository;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;
    private final ProblemRepository problemRepository;
    private final GroqService groqService;

    // Starts a new interview session for a user
    public InterviewSession createSession(String userId, String role, String problemId, String resumeText) {
        // If a coding problem is linked, verify that the problem actually exists
        if (problemId != null && !problemId.trim().isEmpty()) {
            if (!problemRepository.existsById(problemId)) {
                throw new IllegalArgumentException("Problem not found with ID: " + problemId);
            }
        }

        InterviewSession session = InterviewSession.builder()
                .userId(userId)
                .role(role)
                .problemId(problemId)
                .resumeText(resumeText)
                .status("IN_PROGRESS")
                .messages(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();

        return sessionRepository.save(session);
    }

    // Fetches all sessions for a specific user
    public List<InterviewSession> getSessionHistory(String userId) {
        return sessionRepository.findByUserId(userId);
    }

    // Fetches a single session by ID and secures it by checking ownership
    public InterviewSession getSessionById(String id, String userId) {
        InterviewSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Interview session not found with ID: " + id));

        // Enforce security boundaries to prevent horizontal privilege escalation
        if (!session.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized access to this interview session.");
        }

        return session;
    }

    /**
     * Appends user message, calls Groq API to get a Flux stream of the response,
     * and saves the full AI response in MongoDB once the stream is completed.
     */
    public Flux<String> streamChat(String sessionId, String userMsg, String userId) {
        InterviewSession session = getSessionById(sessionId, userId);

        // 1.Save the users chat
        ChatMessage userChatMessage = ChatMessage.builder()
                .sender("USER")
                .message(userMsg)
                .sentAt(LocalDateTime.now())
                .build();
        session.getMessages().add(userChatMessage);
        sessionRepository.save(session);

        // 2.Fetching the dynamic stream responce form Groq
        Flux<String> responseStream = groqService.streamInterviewerResponse(session.getMessages(), session.getRole(),
                session.getResumeText());

        // 3.Accumulate token reactively and sace the aynch to monogo db upon completion
        StringBuilder aiResponseBuilder = new StringBuilder();
        return responseStream
                .doOnNext(aiResponseBuilder::append)
                .doOnComplete(() -> {
                    // we subs on boundedleastic to execute the blocking mongodb save without
                    // blocking the webclient event loop
                    Mono.fromRunnable(() -> {
                        String fullAiResponse = aiResponseBuilder.toString();
                        if (!fullAiResponse.isEmpty()) {
                            InterviewSession currentSession = sessionRepository.findById(sessionId)
                                    .orElse(session);

                            ChatMessage aiChatMessage = ChatMessage.builder()
                                    .sender("AI")
                                    .message(fullAiResponse)
                                    .sentAt(LocalDateTime.now())
                                    .build();

                            currentSession.getMessages().add(aiChatMessage);

                            // checking if the ai maled the interview as complete
                            if (fullAiResponse.contains("[INTERVIEW_OVER]")) {
                                currentSession.setStatus("COMPLETED");
                            }
                            sessionRepository.save(currentSession);
                        }
                    })
                            .subscribeOn(Schedulers.boundedElastic())
                            .subscribe();
                });
    }

    // Terminating the interview and trigger groq to complete a feedback report card
    public InterviewSession evaluateSession(String sessionId, String userId) {
        InterviewSession session = getSessionById(sessionId, userId);

        // requestgroq to score the interview
        GroqService.InterviewEvaluation evaluation = groqService.evaluateSession(session.getMessages(),
                session.getRole(), session.getResumeText());

        session.setCommunicationScore(evaluation.getCommunicationScore());
        session.setDomainKnowledgeScore(evaluation.getDomainKnowledgeScore());
        session.setFeedback(evaluation.getFeedback());
        session.setStatus("COMPLETED");

        return sessionRepository.save(session);
    }
}
