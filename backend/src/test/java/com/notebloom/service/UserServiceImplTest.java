package com.notebloom.service;

import com.notebloom.dto.ChangePasswordRequest;
import com.notebloom.dto.CreateUserRequest;
import com.notebloom.dto.ResetPasswordRequest;
import com.notebloom.dto.UpdateUserRequest;
import com.notebloom.dto.UserResponse;
import com.notebloom.exception.DuplicateUsernameException;
import com.notebloom.exception.InvalidAccountOperationException;
import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import com.notebloom.repository.UserRepository;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private final SessionRegistry sessionRegistry = new SessionRegistryImpl();

    @Mock
    private UserRepository userRepository;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, passwordEncoder, sessionRegistry);
    }

    @Test
    void createStoresLowerCaseUsernameAndHashedPassword() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.save(any(UserModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.create(new CreateUserRequest("Alice", "Alice", "password123", UserRole.USER));

        assertThat(response.username()).isEqualTo("alice");
        verify(userRepository).save(argThat(user ->
                !user.getPasswordHash().equals("password123")
                        && passwordEncoder.matches("password123", user.getPasswordHash())));
    }

    @Test
    void createRejectsDuplicateUsername() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(new CreateUserRequest("alice", "A", "password123", UserRole.USER)))
                .isInstanceOf(DuplicateUsernameException.class);
    }

    @Test
    void createRejectsPasswordLongerThan72Bytes() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        String password = "密".repeat(25); // 75 bytes in UTF-8

        assertThatThrownBy(() -> userService.create(new CreateUserRequest("alice", "A", password, UserRole.USER)))
                .isInstanceOf(InvalidAccountOperationException.class);
    }

    @Test
    void administratorCannotDisableThemselves() {
        UUID adminId = UUID.randomUUID();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(user(adminId, UserRole.ADMIN)));

        assertThatThrownBy(() -> userService.update(adminId, adminId, new UpdateUserRequest("Me", UserRole.ADMIN, false)))
                .isInstanceOf(InvalidAccountOperationException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void disablingAnAccountEndsItsSessions() {
        UUID id = UUID.randomUUID();
        UserModel user = user(id, UserRole.USER);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        sessionRegistry.registerNewSession("session-1", AuthenticatedUser.from(user).withoutPassword());

        userService.update(UUID.randomUUID(), id, new UpdateUserRequest("Bob", UserRole.USER, false));

        assertThat(sessionRegistry.getSessionInformation("session-1").isExpired()).isTrue();
    }

    @Test
    void resettingPasswordEndsSessions() {
        UUID id = UUID.randomUUID();
        UserModel user = user(id, UserRole.USER);
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        sessionRegistry.registerNewSession("session-1", AuthenticatedUser.from(user).withoutPassword());

        userService.resetPassword(id, new ResetPasswordRequest("new-password-1"));

        assertThat(passwordEncoder.matches("new-password-1", user.getPasswordHash())).isTrue();
        assertThat(sessionRegistry.getSessionInformation("session-1").isExpired()).isTrue();
    }

    @Test
    void changeOwnPasswordRequiresCurrentPassword() {
        UUID id = UUID.randomUUID();
        UserModel user = user(id, UserRole.USER);
        user.setPasswordHash(passwordEncoder.encode("old-password"));
        when(userRepository.findById(id)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.changeOwnPassword(id, new ChangePasswordRequest("wrong", "new-password-1")))
                .isInstanceOf(InvalidAccountOperationException.class);

        userService.changeOwnPassword(id, new ChangePasswordRequest("old-password", "new-password-1"));
        assertThat(passwordEncoder.matches("new-password-1", user.getPasswordHash())).isTrue();
    }

    private static UserModel user(UUID id, UserRole role) {
        UserModel user = new UserModel();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setDisplayName("User");
        user.setRole(role);
        user.setEnabled(true);
        return user;
    }
}
