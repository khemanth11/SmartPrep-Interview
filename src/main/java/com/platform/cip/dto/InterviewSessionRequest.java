package com.platform.cip.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewSessionRequest {
    @NotBlank(message = "Role is required")
    private String role;

    private String problemId;

    private String resumeText;
}
