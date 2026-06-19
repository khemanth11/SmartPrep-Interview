package com.platform.cip.security;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // 1. Check if the header contains a Bearer token. If not, pass request to next filter.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extract the JWT token (substring after "Bearer ")
        jwt = authHeader.substring(7);
        
        // 3. Extract username from JWT
        username = jwtService.extractUsername(jwt);

        // 4. If username exists and user is not already authenticated in this thread context
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // 5. Load user details from the database
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            // 6. Verify if the token is valid (matches user, not expired)
            if (jwtService.isTokenValid(jwt, userDetails)) {
                
                // 7. Create UsernamePasswordAuthenticationToken (contains user, credentials, and roles/authorities)
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                
                // 8. Build details (e.g. IP address, session ID) from the HTTP request and attach to authentication
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                
                // 9. Put the authenticated user in Spring's SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // 10. Pass the request to the next filter in the chain (e.g. standard Spring Security filters)
        filterChain.doFilter(request, response);
    }
}
