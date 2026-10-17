package com.notebloom.service.impl;

import com.notebloom.config.LineLoginProperties;
import com.notebloom.exception.LineAccountAlreadyLinkedException;
import com.notebloom.exception.LineLoginException;
import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import com.notebloom.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class LineLoginServiceImplTest {

    private static final String CALLBACK = "https://funtoo.cc/api/auth/line/callback";
    private static final LineLoginProperties PROPERTIES = new LineLoginProperties("1650000000", "channel-secret",
            "https://access.line.me/oauth2/v2.1/authorize", "https://api.line.me/oauth2/v2.1/token",
            "https://api.line.me/v2/profile");

    @Mock
    private UserRepository userRepository;

    private MockRestServiceServer line;
    private LineLoginServiceImpl service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        line = MockRestServiceServer.bindTo(builder).build();
        service = new LineLoginServiceImpl(userRepository, PROPERTIES, builder);
    }

    @Test
    void disabledWithoutChannelCredentials() {
        LineLoginProperties empty = new LineLoginProperties("", "", "a", "b", "c");
        LineLoginServiceImpl off = new LineLoginServiceImpl(userRepository, empty, RestClient.builder());

        assertThat(off.isEnabled()).isFalse();
        assertThatThrownBy(() -> off.authorizationUrl("s", CALLBACK)).isInstanceOf(LineLoginException.class);
    }

    @Test
    void authorizationUrlCarriesChannelStateAndEncodedCallback() {
        String url = service.authorizationUrl("abc", CALLBACK);

        assertThat(url).startsWith("https://access.line.me/oauth2/v2.1/authorize?")
                .contains("response_type=code", "client_id=1650000000", "state=abc", "scope=profile",
                        "redirect_uri=https://funtoo.cc/api/auth/line/callback");
    }

    @Test
    void fetchLineUserIdExchangesCodeThenReadsProfile() {
        line.expect(requestTo("https://api.line.me/oauth2/v2.1/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formDataContains(java.util.Map.of(
                        "grant_type", "authorization_code", "code", "the-code", "redirect_uri", CALLBACK,
                        "client_id", "1650000000", "client_secret", "channel-secret")))
                .andRespond(withSuccess("{\"access_token\":\"tok\",\"expires_in\":2592000,\"token_type\":\"Bearer\"}",
                        MediaType.APPLICATION_JSON));
        line.expect(requestTo("https://api.line.me/v2/profile"))
                .andExpect(header("Authorization", "Bearer tok"))
                .andRespond(withSuccess("{\"userId\":\"U4af4980629\",\"displayName\":\"Jamie\"}", MediaType.APPLICATION_JSON));

        assertThat(service.fetchLineUserId("the-code", CALLBACK)).isEqualTo("U4af4980629");
        line.verify();
    }

    @Test
    void fetchLineUserIdReportsRejectedCode() {
        line.expect(requestTo("https://api.line.me/oauth2/v2.1/token"))
                .andRespond(withBadRequest().body("{\"error\":\"invalid_grant\"}").contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.fetchLineUserId("used-code", CALLBACK)).isInstanceOf(LineLoginException.class);
    }

    @Test
    void findLoginAccountSkipsDisabledAccounts() {
        UserModel disabled = user(UUID.randomUUID());
        disabled.setEnabled(false);
        when(userRepository.findByLineUserId("U1")).thenReturn(Optional.of(disabled));

        assertThat(service.findLoginAccount("U1")).isEmpty();
    }

    @Test
    void linkStoresLineUserId() {
        UserModel alice = user(UUID.randomUUID());
        when(userRepository.findByLineUserId("U1")).thenReturn(Optional.empty());
        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(userRepository.save(any(UserModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.link(alice.getId(), "U1").lineLinked()).isTrue();
        assertThat(alice.getLineUserId()).isEqualTo("U1");
    }

    @Test
    void linkRejectsLineAccountBoundToSomeoneElse() {
        UserModel bob = user(UUID.randomUUID());
        bob.setLineUserId("U1");
        when(userRepository.findByLineUserId("U1")).thenReturn(Optional.of(bob));

        assertThatThrownBy(() -> service.link(UUID.randomUUID(), "U1")).isInstanceOf(LineAccountAlreadyLinkedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void unlinkClearsLineUserId() {
        UserModel alice = user(UUID.randomUUID());
        alice.setLineUserId("U1");
        when(userRepository.findById(alice.getId())).thenReturn(Optional.of(alice));
        when(userRepository.save(any(UserModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.unlink(alice.getId()).lineLinked()).isFalse();
        assertThat(alice.getLineUserId()).isNull();
    }

    private static UserModel user(UUID id) {
        UserModel user = new UserModel();
        user.setId(id);
        user.setUsername("alice");
        user.setDisplayName("Alice");
        user.setRole(UserRole.USER);
        user.setEnabled(true);
        return user;
    }
}
