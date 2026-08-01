package com.platform.cip.controller;

import com.platform.cip.document.CompanyPrepPlan;
import com.platform.cip.document.User;
import com.platform.cip.dto.CompanyPrepRequest;
import com.platform.cip.service.CompanyPrepService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/company-prep")
@RequiredArgsConstructor
public class CompanyPrepController {

    private final CompanyPrepService companyPrepService;

    @PostMapping("/generate")
    public ResponseEntity<CompanyPrepPlan> generatePrepPlan(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CompanyPrepRequest request) {
        CompanyPrepPlan plan = companyPrepService.generatePrepPlan(user.getId(), request);
        return ResponseEntity.ok(plan);
    }

    @GetMapping("/active")
    public ResponseEntity<CompanyPrepPlan> getActivePrepPlan(@AuthenticationPrincipal User user) {
        CompanyPrepPlan plan = companyPrepService.getActivePrepPlan(user.getId());
        if (plan == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(plan);
    }
}
