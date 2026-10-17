package com.notebloom.controller;

import com.notebloom.config.SecurityConfig;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.LineAccountAlreadyLinkedException;
import com.notebloom.model.UserRole;
import com.notebloom.security.AccountUserDetailsService;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.security.PendingLineLogin;
import com.notebloom.security.SessionLogin;
import com.notebloom.service.LineLoginService;
import com.notebloom.service.LoginAttemptService;
import com.notebloom.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({LineLoginController.class, AuthController.class})
@Import({SecurityConfig.class, SessionLogin.class})
class LineLoginControllerTest {

    private static final String CALLBACK = "http://localhost/api/auth/line/callback";
    private static final String LINE_USER_ID = "U4af4980629";
    private static final AuthenticatedUser ALICE =
            new AuthenticatedUser(UUID.randomUUID(), "alice", "Alice", UserRole.USER, null, true);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LineLoginService lineLoginService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private LoginAttemptService loginAttemptService;

    @MockitoBean
    private AccountUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        when(lineLoginService.isEnabled()).thenReturn(true);
        when(lineLoginService.authorizationUrl(anyString(), anyString()))
                .thenAnswer(invocation -> "https://access.line.me/authorize?state=" + invocation.getArgument(0));
        when(userService.get(ALICE.id())).thenReturn(
                new UserResponse(ALICE.id(), "alice", "Alice", UserRole.USER, true, true, Instant.now()));
    }

    @Test
    void optionsArePublic() throws Exception {
        mockMvc.perform(get("/api/auth/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lineLoginEnabled").value(true));
    }

    @Test
    void loginRedirectsToLineAndRemembersState() throws Exception {
        MockHttpSession session = new MockHttpSession();

        mockMvc.perform(get("/api/auth/line/login").session(session))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://access.line.me/authorize?state=" + pending(session).state()));

        assertThat(pending(session).redirectUri()).isEqualTo(CALLBACK);
        assertThat(pending(session).isLink()).isFalse();
    }

    @Test
    void loginRedirectsBackWhenLineLoginIsOff() throws Exception {
        when(lineLoginService.isEnabled()).thenReturn(false);

        mockMvc.perform(get("/api/auth/line/login"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/?line=disabled"));
    }

    @Test
    void callbackLogsInTheBoundAccount() throws Exception {
        MockHttpSession session = startLogin();
        String state = pending(session).state();
        when(lineLoginService.fetchLineUserId("the-code", CALLBACK)).thenReturn(LINE_USER_ID);
        when(lineLoginService.findLoginAccount(LINE_USER_ID)).thenReturn(Optional.of(ALICE));

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code").param("state", state).session(session))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/?line=logged-in"));

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void callbackRefusesLineAccountsThatAreNotBound() throws Exception {
        MockHttpSession session = startLogin();
        when(lineLoginService.fetchLineUserId("the-code", CALLBACK)).thenReturn(LINE_USER_ID);
        when(lineLoginService.findLoginAccount(LINE_USER_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code")
                        .param("state", pending(session).state()).session(session))
                .andExpect(header().string("Location", "/?line=not-linked"));

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void callbackIgnoresStateThatDoesNotMatchTheSession() throws Exception {
        MockHttpSession session = startLogin();

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code").param("state", "forged").session(session))
                .andExpect(header().string("Location", "/?line=expired"));

        verify(lineLoginService, never()).fetchLineUserId(anyString(), anyString());
    }

    @Test
    void stateCanOnlyBeUsedOnce() throws Exception {
        MockHttpSession session = startLogin();
        String state = pending(session).state();

        mockMvc.perform(get("/api/auth/line/callback").param("error", "access_denied").param("state", state).session(session))
                .andExpect(header().string("Location", "/?line=cancelled"));
        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code").param("state", state).session(session))
                .andExpect(header().string("Location", "/?line=expired"));

        verify(lineLoginService, never()).fetchLineUserId(anyString(), anyString());
    }

    @Test
    void linkRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/auth/line/link").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void linkBindsLineToTheAccountThatStartedIt() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post("/api/auth/line/link").with(user(ALICE)).with(csrf()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorizeUrl").value("https://access.line.me/authorize?state=" + pending(session).state()));
        when(lineLoginService.fetchLineUserId("the-code", CALLBACK)).thenReturn(LINE_USER_ID);

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code")
                        .param("state", pending(session).state()).with(user(ALICE)).session(session))
                .andExpect(header().string("Location", "/?line=linked"));

        verify(lineLoginService).link(ALICE.id(), LINE_USER_ID);
    }

    @Test
    void linkDoesNotFinishInADifferentAccount() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post("/api/auth/line/link").with(user(ALICE)).with(csrf()).session(session));
        AuthenticatedUser bob = new AuthenticatedUser(UUID.randomUUID(), "bob", "Bob", UserRole.USER, null, true);

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code")
                        .param("state", pending(session).state()).with(user(bob)).session(session))
                .andExpect(header().string("Location", "/?line=expired"));

        verify(lineLoginService, never()).link(eq(bob.id()), anyString());
    }

    @Test
    void linkReportsLineAccountsBoundElsewhere() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post("/api/auth/line/link").with(user(ALICE)).with(csrf()).session(session));
        when(lineLoginService.fetchLineUserId("the-code", CALLBACK)).thenReturn(LINE_USER_ID);
        when(lineLoginService.link(ALICE.id(), LINE_USER_ID)).thenThrow(new LineAccountAlreadyLinkedException());

        mockMvc.perform(get("/api/auth/line/callback").param("code", "the-code")
                        .param("state", pending(session).state()).with(user(ALICE)).session(session))
                .andExpect(header().string("Location", "/?line=taken"));
    }

    private MockHttpSession startLogin() throws Exception {
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(get("/api/auth/line/login").session(session));
        return session;
    }

    private static PendingLineLogin pending(MockHttpSession session) {
        return (PendingLineLogin) session.getAttribute(PendingLineLogin.SESSION_ATTRIBUTE);
    }
}
