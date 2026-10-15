package com.notebloom.dto;

import com.notebloom.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param enabled false blocks the account from logging in and ends its current sessions
 */
public record UpdateUserRequest(
        @NotBlank @Size(max = 100) String displayName,
        @NotNull UserRole role,
        boolean enabled
) {
}
