package com.notebloom.security;

import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * The logged-in account as kept in the HTTP session. Controllers receive it through
 * {@code @AuthenticationPrincipal} and pass {@link #id()} to services as the data owner.
 */
public record AuthenticatedUser(
        UUID id,
        String username,
        String displayName,
        UserRole role,
        String passwordHash,
        boolean enabled
) implements UserDetails, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    public static AuthenticatedUser from(UserModel user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                user.getPasswordHash(),
                user.isEnabled()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    /** The hash is only needed while authenticating; keep it out of the session. */
    public AuthenticatedUser withoutPassword() {
        return new AuthenticatedUser(id, username, displayName, role, null, enabled);
    }
}
