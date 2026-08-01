package com.platform.cip.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashSet;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_progress")
public class UserProgress {
    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    @Builder.Default
    private Set<String> completedProblemIds = new HashSet<>();
}
