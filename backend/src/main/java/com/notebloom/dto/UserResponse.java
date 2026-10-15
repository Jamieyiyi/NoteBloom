package com.notebloom.dto;

import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String displayName,
        UserRole role,
        boolean enabled,
        Instant createdAt
) {
    public static UserResponse from(UserModel user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
