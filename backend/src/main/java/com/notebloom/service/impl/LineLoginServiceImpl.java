package com.notebloom.service.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.notebloom.config.LineLoginProperties;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.LineAccountAlreadyLinkedException;
import com.notebloom.exception.LineLoginException;
import com.notebloom.exception.UserNotFoundException;
import com.notebloom.model.UserModel;
import com.notebloom.repository.UserRepository;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.LineLoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class LineLoginServiceImpl implements LineLoginService {

    private final UserRepository userRepository;
    private final LineLoginProperties properties;
    private final RestClient restClient;

    @Autowired
    public LineLoginServiceImpl(UserRepository userRepository, LineLoginProperties properties) {
        this(userRepository, properties, RestClient.builder());
    }

    /** Lets tests point the HTTP client at a mock server. */
    LineLoginServiceImpl(UserRepository userRepository, LineLoginProperties properties, RestClient.Builder restClient) {
        this.userRepository = userRepository;
        this.properties = properties;
        this.restClient = restClient.build();
    }

    @Override
    public boolean isEnabled() {
        return properties.enabled();
    }

    @Override
    public String authorizationUrl(String state, String redirectUri) {
        requireEnabled();
        return UriComponentsBuilder.fromUriString(properties.authorizationUri())
                .queryParam("response_type", "code")
                .queryParam("client_id", properties.channelId())
                .queryParam("redirect_uri", redirectUri)
                .queryParam("state", state)
                // profile is enough to learn the LINE user ID; no e-mail or other personal data is requested
                .queryParam("scope", "profile")
                .encode()
                .toUriString();
    }

    @Override
    public String fetchLineUserId(String code, String redirectUri) {
        requireEnabled();
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "authorization_code");
            form.add("code", code);
            form.add("redirect_uri", redirectUri);
            form.add("client_id", properties.channelId());
            form.add("client_secret", properties.channelSecret());
            TokenResponse token = restClient.post()
                    .uri(properties.tokenUri())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
            if (token == null || !StringUtils.hasText(token.accessToken())) {
                throw new LineLoginException("LINE did not return an access token");
            }

            ProfileResponse profile = restClient.get()
                    .uri(properties.profileUri())
                    .headers(headers -> headers.setBearerAuth(token.accessToken()))
                    .retrieve()
                    .body(ProfileResponse.class);
            if (profile == null || !StringUtils.hasText(profile.userId())) {
                throw new LineLoginException("LINE did not return a user ID");
            }
            return profile.userId();
        } catch (RestClientException ex) {
            throw new LineLoginException("LINE Login request failed", ex);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuthenticatedUser> findLoginAccount(String lineUserId) {
        return userRepository.findByLineUserId(lineUserId)
                .filter(UserModel::isEnabled)
                .map(AuthenticatedUser::from);
    }

    @Override
    public UserResponse link(UUID userId, String lineUserId) {
        Optional<UserModel> owner = userRepository.findByLineUserId(lineUserId);
        if (owner.isPresent() && !owner.get().getId().equals(userId)) {
            throw new LineAccountAlreadyLinkedException();
        }
        UserModel user = findOrThrow(userId);
        user.setLineUserId(lineUserId);
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    public UserResponse unlink(UUID userId) {
        UserModel user = findOrThrow(userId);
        user.setLineUserId(null);
        return UserResponse.from(userRepository.save(user));
    }

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new LineLoginException("LINE Login is not configured");
        }
    }

    private UserModel findOrThrow(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }

    record TokenResponse(@JsonProperty("access_token") String accessToken) {
    }

    record ProfileResponse(String userId) {
    }
}
