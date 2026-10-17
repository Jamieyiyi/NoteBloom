package com.notebloom.security;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

/**
 * A LINE Login started in this session and waiting for LINE to redirect back.
 *
 * @param state       random value sent to LINE; the callback must return it, which proves it belongs to this session
 * @param redirectUri callback URL sent to LINE; the token request must repeat it exactly
 * @param linkUserId  account to bind the LINE account to, or null when logging in
 */
public record PendingLineLogin(String state, String redirectUri, UUID linkUserId) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    public static final String SESSION_ATTRIBUTE = PendingLineLogin.class.getName();

    public boolean isLink() {
        return linkUserId != null;
    }
}
