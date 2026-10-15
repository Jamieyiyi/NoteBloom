package com.notebloom.controller;

import com.notebloom.config.SecurityConfig;
import com.notebloom.dto.LoginRequest;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.LoginLockedException;
import com.notebloom.model.UserRole;
import com.notebloom.security.AccountUserDetailsService;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.LoginAttemptService;
import com.notebloom.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AuthController.class, UserController.class})
@Import(SecurityConfig.class)
class AuthControllerTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String PASSWORD = "correct-horse";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private AccountUserDetailsService userDetailsService;

    @MockitoBean
    private LoginAttemptService loginAttemptService;

    @MockitoBean
    private UserService userService;

    @BeforeEach
    void setUp() {
        when(userDetailsService.loadUserByUsername("alice")).thenReturn(new AuthenticatedUser(
                USER_ID, "alice", "Alice", UserRole.USER, passwordEncoder.encode(PASSWORD), true));
        when(userDetailsService.loadUserByUsername("nobody")).thenThrow(new UsernameNotFoundException("Unknown user"));
        when(userService.get(USER_ID)).thenReturn(
                new UserResponse(USER_ID, "alice", "Alice", UserRole.USER, true, Instant.now()));
    }

    @Test
    void loginCreatesSessionThatAuthenticatesLaterRequests() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(login("alice", PASSWORD).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
        verify(loginAttemptService).recordSuccess("alice");

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice"));
    }

    @Test
    void wrongPasswordReturns401AndCountsFailure() throws Exception {
        mockMvc.perform(login("alice", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("帳號或密碼錯誤"));

        verify(loginAttemptService).recordFailure("alice");
    }

    @Test
    void unknownUserGetsTheSameAnswerAsWrongPassword() throws Exception {
        mockMvc.perform(login("nobody", PASSWORD))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("帳號或密碼錯誤"));
    }

    @Test
    void lockedAccountReturns429() throws Exception {
        doThrow(new LoginLockedException(Duration.ofMinutes(10))).when(loginAttemptService).ensureNotLocked(anyString());

        mockMvc.perform(login("alice", PASSWORD))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void loginRequiresCsrfToken() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("alice", PASSWORD))))
                .andExpect(status().isForbidden());
    }

    @Test
    void meReturns401WithoutLogin() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpointsRejectRegularUsers() throws Exception {
        AuthenticatedUser regular = new AuthenticatedUser(USER_ID, "alice", "Alice", UserRole.USER, null, true);

        mockMvc.perform(get("/api/admin/users").with(user(regular)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpointsAllowAdministrators() throws Exception {
        AuthenticatedUser admin = new AuthenticatedUser(UUID.randomUUID(), "root", "Root", UserRole.ADMIN, null, true);

        mockMvc.perform(get("/api/admin/users").with(user(admin)))
                .andExpect(status().isOk());
    }

    private MockHttpServletRequestBuilder login(String username, String password) {
        return post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(username, password)));
    }
}
