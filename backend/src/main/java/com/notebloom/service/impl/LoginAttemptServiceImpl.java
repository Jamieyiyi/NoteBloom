package com.notebloom.service.impl;

import com.notebloom.exception.LoginLockedException;
import com.notebloom.service.LoginAttemptService;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory counter keyed by username; a restart clears it, which is acceptable for a single instance.
 */
@Service
public class LoginAttemptServiceImpl implements LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private record Attempts(int failures, Instant lockedUntil) {
    }

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptServiceImpl() {
        this(Clock.systemUTC());
    }

    LoginAttemptServiceImpl(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void ensureNotLocked(String username) {
        Attempts current = attempts.get(key(username));
        if (current != null && current.lockedUntil() != null && current.lockedUntil().isAfter(clock.instant())) {
            throw new LoginLockedException(Duration.between(clock.instant(), current.lockedUntil()));
        }
    }

    @Override
    public void recordFailure(String username) {
        attempts.compute(key(username), (key, current) -> {
            // A lock that has expired starts a fresh count
            int failures = current == null || isExpiredLock(current) ? 1 : current.failures() + 1;
            Instant lockedUntil = failures >= MAX_FAILURES ? clock.instant().plus(LOCK_DURATION) : null;
            return new Attempts(failures, lockedUntil);
        });
    }

    @Override
    public void recordSuccess(String username) {
        attempts.remove(key(username));
    }

    private boolean isExpiredLock(Attempts current) {
        return current.lockedUntil() != null && !current.lockedUntil().isAfter(clock.instant());
    }

    private static String key(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
