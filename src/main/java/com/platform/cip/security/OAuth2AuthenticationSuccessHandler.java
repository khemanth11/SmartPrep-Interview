package com.platform.cip.security;

import com.platform.cip.document.Role;
import com.platform.cip.document.User;
import com.platform.cip.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oauth2User.getAttributes();

        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        String login = (String) attributes.get("login"); // GitHub username

        String username = (name != null && !name.trim().isEmpty()) ? name.trim().replaceAll("\\s+", "_").toLowerCase()
                : (login != null ? login : "user_" + UUID.randomUUID().toString().substring(0, 8));

        if (email == null || email.trim().isEmpty()) {
            email = username + "@oauth2.user";
        }

        final String userEmail = email;
        final String userHandle = username;

        User user = userRepository.findByEmail(userEmail)
                .orElseGet(() -> userRepository.findByUsername(userHandle)
                        .orElseGet(() -> {
                            User newUser = User.builder()
                                    .username(userHandle)
                                    .email(userEmail)
                                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                                    .roles(Set.of(Role.ROLE_USER))
                                    .build();
                            return userRepository.save(newUser);
                        }));

        String jwtToken = jwtService.generateToken(user);

        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/")
                .queryParam("token", jwtToken)
                .queryParam("username", user.getUsername())
                .build().toUriString();

        log.info("OAuth2 login successful for user {}. Redirecting to frontend.", user.getUsername());
        response.sendRedirect(targetUrl);
    }
}
