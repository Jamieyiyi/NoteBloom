package com.notebloom.service;

import com.notebloom.dto.UserResponse;
import com.notebloom.security.AuthenticatedUser;

import java.util.Optional;
import java.util.UUID;

/**
 * LINE Login. LINE only proves who someone is on LINE; accounts are still created by administrators,
 * so a LINE account can log in only after its owner has bound it to their NoteBloom account.
 */
public interface LineLoginService {

    boolean isEnabled();

    /** LINE's login page; LINE redirects back to {@code redirectUri} with a code and the same {@code state}. */
    String authorizationUrl(String state, String redirectUri);

    /** Exchanges the code LINE returned for the LINE user ID of whoever logged in. */
    String fetchLineUserId(String code, String redirectUri);

    /** The enabled account bound to this LINE user, if any. */
    Optional<AuthenticatedUser> findLoginAccount(String lineUserId);

    /** Binds the LINE account to {@code userId}, replacing a previously bound one. */
    UserResponse link(UUID userId, String lineUserId);

    UserResponse unlink(UUID userId);
}
