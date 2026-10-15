package com.notebloom.service;

import com.notebloom.dto.ChangePasswordRequest;
import com.notebloom.dto.CreateUserRequest;
import com.notebloom.dto.ResetPasswordRequest;
import com.notebloom.dto.UpdateUserRequest;
import com.notebloom.dto.UserResponse;

import java.util.List;
import java.util.UUID;

/**
 * Accounts are invitation-only: there is no self sign-up, administrators create every account.
 */
public interface UserService {

    UserResponse get(UUID id);

    List<UserResponse> list();

    UserResponse create(CreateUserRequest request);

    /** {@code actorId} is the administrator making the change; they cannot demote or disable themselves. */
    UserResponse update(UUID actorId, UUID id, UpdateUserRequest request);

    /** Sets a new password chosen by an administrator and signs the account out everywhere. */
    void resetPassword(UUID id, ResetPasswordRequest request);

    /** Lets users change their own password after confirming the current one. */
    void changeOwnPassword(UUID userId, ChangePasswordRequest request);
}
