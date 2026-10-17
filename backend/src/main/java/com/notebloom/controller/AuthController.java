package com.notebloom.controller;

import com.notebloom.dto.AuthOptionsResponse;
import com.notebloom.dto.ChangePasswordRequest;
import com.notebloom.dto.LoginRequest;
import com.notebloom.dto.UserResponse;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.security.SessionLogin;
import com.notebloom.service.LineLoginService;
import com.notebloom.service.LoginAttemptService;
import com.notebloom.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Login, current account and own password. Logout is handled by Spring Security at POST /api/auth/logout.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SessionLogin sessionLogin;
    private final LoginAttemptService loginAttemptService;
    private final UserService userService;
    private final LineLoginService lineLoginService;

    public AuthController(AuthenticationManager authenticationManager,
                          SessionLogin sessionLogin,
                          LoginAttemptService loginAttemptService,
                          UserService userService,
                          LineLoginService lineLoginService) {
        this.authenticationManager = authenticationManager;
        this.sessionLogin = sessionLogin;
        this.loginAttemptService = loginAttemptService;
        this.userService = userService;
        this.lineLoginService = lineLoginService;
    }

    /** Public: which login methods the login page should offer. */
    @GetMapping("/options")
    public AuthOptionsResponse options() {
        return new AuthOptionsResponse(lineLoginService.isEnabled());
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        loginAttemptService.ensureNotLocked(request.username());

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.username(), request.password()));
        } catch (AuthenticationException ex) {
            loginAttemptService.recordFailure(request.username());
            // Same message for unknown, disabled and wrong-password accounts so none of them can be probed
            throw new BadCredentialsException("帳號或密碼錯誤");
        }
        loginAttemptService.recordSuccess(request.username());

        AuthenticatedUser user = (AuthenticatedUser) authentication.getPrincipal();
        sessionLogin.logIn(user, httpRequest, httpResponse);
        return userService.get(user.id());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return userService.get(user.id());
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser user,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        userService.changeOwnPassword(user.id(), request);
        return ResponseEntity.noContent().build();
    }
}
