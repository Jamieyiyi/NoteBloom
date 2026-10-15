package com.notebloom.service;

/**
 * Slows down password guessing: after too many consecutive failures an account is locked for a while.
 */
public interface LoginAttemptService {

    /** Throws {@link com.notebloom.exception.LoginLockedException} while the username is locked. */
    void ensureNotLocked(String username);

    void recordFailure(String username);

    void recordSuccess(String username);
}
