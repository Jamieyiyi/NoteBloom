package com.notebloom.controller;

import com.notebloom.dto.LineAuthorizeResponse;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.LineAccountAlreadyLinkedException;
import com.notebloom.exception.LineLoginException;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.security.PendingLineLogin;
import com.notebloom.security.SessionLogin;
import com.notebloom.service.LineLoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * LINE Login. The browser leaves NoteBloom for LINE and comes back to {@link #callback}, which then redirects
 * to the app with {@code ?line=<result>} so the front end can show what happened.
 */
@RestController
@RequestMapping("/api/auth/line")
public class LineLoginController {

    private static final Logger log = LoggerFactory.getLogger(LineLoginController.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final LineLoginService lineLoginService;
    private final SessionLogin sessionLogin;

    public LineLoginController(LineLoginService lineLoginService, SessionLogin sessionLogin) {
        this.lineLoginService = lineLoginService;
        this.sessionLogin = sessionLogin;
    }

    /** Public: the login page's「使用 LINE 登入」button navigates here. */
    @GetMapping("/login")
    public ResponseEntity<Void> login(HttpServletRequest request) {
        if (!lineLoginService.isEnabled()) {
            return redirectToApp("disabled");
        }
        return redirect(start(request, null));
    }

    /** Starts binding LINE to the logged-in account; the front end then opens the returned URL. */
    @PostMapping("/link")
    public LineAuthorizeResponse link(@AuthenticationPrincipal AuthenticatedUser user, HttpServletRequest request) {
        if (!lineLoginService.isEnabled()) {
            throw new LineLoginException("LINE Login is not configured");
        }
        return new LineAuthorizeResponse(start(request, user));
    }

    @DeleteMapping
    public UserResponse unlink(@AuthenticationPrincipal AuthenticatedUser user) {
        return lineLoginService.unlink(user.id());
    }

    /** Public: LINE redirects the browser here after the user approves or cancels. */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error,
                                         @AuthenticationPrincipal AuthenticatedUser currentUser,
                                         HttpServletRequest request, HttpServletResponse response) {
        // One attempt per start: whatever happens, the pending login is used up
        HttpSession session = request.getSession(false);
        PendingLineLogin pending = session == null ? null
                : (PendingLineLogin) session.getAttribute(PendingLineLogin.SESSION_ATTRIBUTE);
        if (session != null) {
            session.removeAttribute(PendingLineLogin.SESSION_ATTRIBUTE);
        }

        // A state that does not match was not started from this browser (or is a replay): never act on it
        if (pending == null || state == null || !constantTimeEquals(pending.state(), state)) {
            return redirectToApp("expired");
        }
        if (error != null || code == null) {
            return redirectToApp("cancelled");
        }

        String lineUserId;
        try {
            lineUserId = lineLoginService.fetchLineUserId(code, pending.redirectUri());
        } catch (LineLoginException ex) {
            log.warn("LINE Login failed", ex);
            return redirectToApp("failed");
        }

        if (pending.isLink()) {
            // Binding must finish in the same account that started it
            if (currentUser == null || !currentUser.id().equals(pending.linkUserId())) {
                return redirectToApp("expired");
            }
            try {
                lineLoginService.link(currentUser.id(), lineUserId);
                return redirectToApp("linked");
            } catch (LineAccountAlreadyLinkedException ex) {
                return redirectToApp("taken");
            }
        }

        Optional<AuthenticatedUser> account = lineLoginService.findLoginAccount(lineUserId);
        if (account.isEmpty()) {
            return redirectToApp("not-linked");
        }
        sessionLogin.logIn(account.get(), request, response);
        return redirectToApp("logged-in");
    }

    private String start(HttpServletRequest request, AuthenticatedUser linkUser) {
        String state = randomState();
        // Built from the incoming request, so behind cloudflared it is https://funtoo.cc/... (see forward-headers-strategy)
        String redirectUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/auth/line/callback").build().toUriString();
        request.getSession().setAttribute(PendingLineLogin.SESSION_ATTRIBUTE,
                new PendingLineLogin(state, redirectUri, linkUser == null ? null : linkUser.id()));
        return lineLoginService.authorizationUrl(state, redirectUri);
    }

    private static String randomState() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private static ResponseEntity<Void> redirectToApp(String result) {
        return redirect("/?line=" + result);
    }

    private static ResponseEntity<Void> redirect(String location) {
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, location).build();
    }
}
