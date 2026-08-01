package com.platform.cip.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "submissions")
public class Submission {
    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String problemId;

    private String code;
    private String language;
    private String status; // ACCEPTED, WRONG_ANSWER, COMPILE_ERROR, TIME_LIMIT_EXCEEDED, RUNTIME_ERROR
    private int passedCount;
    private int totalCount;

    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();
}
