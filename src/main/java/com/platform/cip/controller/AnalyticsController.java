package com.platform.cip.controller;

import com.platform.cip.document.User;
import com.platform.cip.dto.UserAnalyticsResponse;
import com.platform.cip.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<UserAnalyticsResponse> getUserAnalytics(@AuthenticationPrincipal User user) {
        UserAnalyticsResponse response = analyticsService.getUserAnalytics(user.getId());
        return ResponseEntity.ok(response);
    }
}
