package com.platform.cip.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "problems")
public class Problem {
    @Id
    private String id;

    @Indexed(unique = true)
    private String title;
    private String description;
    private Difficulty difficulty;
    private List<String> tags;
    private String inputFormat;
    private String outputFormat;
    private String constraints;
    private String systemTemplate;
    private List<TestCase> sampleTestCases;
    private List<TestCase> hiddenTestCases;
    private String driverCode;
    private String jsTemplate;
    private String jsDriverCode;
    private String javaTemplate;
    private String javaDriverCode;
    private String cppTemplate;
    private String cppDriverCode;
    private String goTemplate;
    private String goDriverCode;
    private String category;
    private int moduleOrder;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}