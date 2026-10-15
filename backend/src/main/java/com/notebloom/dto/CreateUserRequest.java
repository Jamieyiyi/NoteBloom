package com.notebloom.dto;

import com.notebloom.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param username 3–50 letters, digits, dots, underscores or hyphens; stored lower-case
 * @param password initial password, handed to the new user by the administrator
 */
public record CreateUserRequest(
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9._-]{3,50}$", message = "只能使用 3–50 個英數字、點、底線或連字號") String username,
        @NotBlank @Size(max = 100) String displayName,
        @NotBlank @Size(min = 8, max = 72, message = "長度需為 8–72 個字元") String password,
        @NotNull UserRole role
) {
}
