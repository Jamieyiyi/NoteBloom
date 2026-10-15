package com.notebloom.service.impl;

import com.notebloom.exception.LoginLockedException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceImplTest {

    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");

    private Clock clock = Clock.fixed(START, ZoneOffset.UTC);

    private final LoginAttemptServiceImpl service = new LoginAttemptServiceImpl(new Clock() {
        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return clock.instant();
        }
    });

    @Test
    void locksAfterTooManyFailures() {
        failTimes(LoginAttemptServiceImpl.MAX_FAILURES - 1);
        assertThatCode(() -> service.ensureNotLocked("alice")).doesNotThrowAnyException();

        service.recordFailure("alice");
        assertThatThrownBy(() -> service.ensureNotLocked("ALICE"))
                .isInstanceOf(LoginLockedException.class);
    }

    @Test
    void lockExpiresAfterLockDuration() {
        failTimes(LoginAttemptServiceImpl.MAX_FAILURES);

        clock = Clock.fixed(START.plus(LoginAttemptServiceImpl.LOCK_DURATION).plus(Duration.ofSeconds(1)), ZoneOffset.UTC);

        assertThatCode(() -> service.ensureNotLocked("alice")).doesNotThrowAnyException();
    }

    @Test
    void successResetsTheCounter() {
        failTimes(LoginAttemptServiceImpl.MAX_FAILURES - 1);
        service.recordSuccess("alice");
        service.recordFailure("alice");

        assertThatCode(() -> service.ensureNotLocked("alice")).doesNotThrowAnyException();
    }

    private void failTimes(int times) {
        for (int i = 0; i < times; i++) {
            service.recordFailure("alice");
        }
    }
}
