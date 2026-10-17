package com.notebloom.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

/**
 * Starts a logged-in session for an account, shared by password login and LINE Login.
 */
@Component
public class SessionLogin {

    private final SecurityContextRepository securityContextRepository;
    private final SessionRegistry sessionRegistry;
    private final SecurityContextHolderStrategy securityContextHolderStrategy =
            SecurityContextHolder.getContextHolderStrategy();

    public SessionLogin(SecurityContextRepository securityContextRepository, SessionRegistry sessionRegistry) {
        this.securityContextRepository = securityContextRepository;
        this.sessionRegistry = sessionRegistry;
    }

    public void logIn(AuthenticatedUser account, HttpServletRequest request, HttpServletResponse response) {
        AuthenticatedUser user = account.withoutPassword();
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());

        // A fresh session id on login prevents session fixation
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        sessionRegistry.registerNewSession(request.getSession().getId(), user);
    }
}
