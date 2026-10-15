package com.notebloom.service.impl;

import com.notebloom.dto.ChangePasswordRequest;
import com.notebloom.dto.CreateUserRequest;
import com.notebloom.dto.ResetPasswordRequest;
import com.notebloom.dto.UpdateUserRequest;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.DuplicateUsernameException;
import com.notebloom.exception.InvalidAccountOperationException;
import com.notebloom.exception.UserNotFoundException;
import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import com.notebloom.repository.UserRepository;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.UserService;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    /** BCrypt only uses the first 72 bytes; longer passwords are rejected instead of silently truncated. */
    private static final int MAX_PASSWORD_BYTES = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionRegistry sessionRegistry;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           SessionRegistry sessionRegistry) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessionRegistry = sessionRegistry;
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse get(UUID id) {
        return UserResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return userRepository.findAll(Sort.by("createdAt")).stream()
                .map(UserResponse::from)
                .toList();
    }

    @Override
    public UserResponse create(CreateUserRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsername(username)) {
            throw new DuplicateUsernameException(username);
        }

        UserModel user = new UserModel();
        user.setUsername(username);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(encode(request.password()));
        user.setRole(request.role());
        user.setEnabled(true);
        return UserResponse.from(userRepository.save(user));
    }

    @Override
    public UserResponse update(UUID actorId, UUID id, UpdateUserRequest request) {
        UserModel user = findOrThrow(id);
        // Guard against an administrator locking everyone out of account management
        if (actorId.equals(id) && (!request.enabled() || request.role() != UserRole.ADMIN)) {
            throw new InvalidAccountOperationException("不能停用自己的帳號，或移除自己的管理者權限");
        }

        boolean accessChanged = user.isEnabled() != request.enabled() || user.getRole() != request.role();
        user.setDisplayName(request.displayName().trim());
        user.setRole(request.role());
        user.setEnabled(request.enabled());
        UserModel saved = userRepository.save(user);

        // Sessions carry the old role / enabled flag, so they must not outlive the change
        if (accessChanged) {
            expireSessions(id);
        }
        return UserResponse.from(saved);
    }

    @Override
    public void resetPassword(UUID id, ResetPasswordRequest request) {
        UserModel user = findOrThrow(id);
        user.setPasswordHash(encode(request.newPassword()));
        userRepository.save(user);
        expireSessions(id);
    }

    @Override
    public void changeOwnPassword(UUID userId, ChangePasswordRequest request) {
        UserModel user = findOrThrow(userId);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidAccountOperationException("目前的密碼不正確");
        }
        user.setPasswordHash(encode(request.newPassword()));
        userRepository.save(user);
    }

    private String encode(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new InvalidAccountOperationException("密碼太長（中文字約 24 字以內）");
        }
        return passwordEncoder.encode(password);
    }

    private void expireSessions(UUID userId) {
        sessionRegistry.getAllPrincipals().stream()
                .filter(principal -> principal instanceof AuthenticatedUser user && user.id().equals(userId))
                .flatMap(principal -> sessionRegistry.getAllSessions(principal, false).stream())
                .forEach(SessionInformation::expireNow);
    }

    private UserModel findOrThrow(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
    }
}
