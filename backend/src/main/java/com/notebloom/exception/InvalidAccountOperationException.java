package com.notebloom.exception;

/** A request that would leave an account in an unusable state, such as a wrong current password. */
public class InvalidAccountOperationException extends RuntimeException {

    public InvalidAccountOperationException(String message) {
        super(message);
    }
}
