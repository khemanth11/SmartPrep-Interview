package com.platform.cip.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "interview_sessions")
public class InterviewSession {

    @Id
    private String id;

    private String userId;

    private String problemId;

    private String role;

    @Builder.Default
    private String status = "IN_PROGRESS";

    private Integer communicationScore;

    private Integer domainKnowledgeScore;
    private List<ChatMessage> messages;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
