package com.notebloom.config;

import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import com.notebloom.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

/**
 * Activates the administrator account created by the 002 Liquibase changeset, which starts without a password.
 * <p>
 * When an administrator still has no password and {@code notebloom.bootstrap.admin-password} is set, that
 * account gets the configured username, display name and password. Once a password exists the properties
 * are ignored, so they can (and should) be removed after the first successful login.
 */
@Component
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String displayName;
    private final String password;

    public AdminAccountInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder,
                                   @Value("${notebloom.bootstrap.admin-username:}") String username,
                                   @Value("${notebloom.bootstrap.admin-display-name:}") String displayName,
                                   @Value("${notebloom.bootstrap.admin-password:}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.displayName = displayName;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<UserModel> pending = userRepository.findByRoleAndPasswordHashIsNull(UserRole.ADMIN);
        if (pending.isEmpty()) {
            return;
        }
        if (!StringUtils.hasText(password)) {
            log.warn("Administrator account '{}' has no password yet. Set notebloom.bootstrap.admin-password "
                    + "(environment variable NOTEBLOOM_BOOTSTRAP_ADMIN_PASSWORD) and restart to activate it.",
                    pending.getFirst().getUsername());
            return;
        }
        if (password.length() < 8) {
            log.warn("notebloom.bootstrap.admin-password must be at least 8 characters; administrator not activated.");
            return;
        }

        UserModel admin = pending.getFirst();
        if (StringUtils.hasText(username)) {
            String normalized = username.trim().toLowerCase(Locale.ROOT);
            if (!normalized.equals(admin.getUsername()) && userRepository.existsByUsername(normalized)) {
                log.warn("Cannot rename administrator to '{}': that username is already taken.", normalized);
                return;
            }
            admin.setUsername(normalized);
        }
        if (StringUtils.hasText(displayName)) {
            admin.setDisplayName(displayName.trim());
        }
        admin.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(admin);
        log.info("Administrator account '{}' activated. Remove notebloom.bootstrap.* from the configuration now.",
                admin.getUsername());
    }
}
