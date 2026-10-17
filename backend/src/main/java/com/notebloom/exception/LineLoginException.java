package com.notebloom.exception;

/** LINE Login is not configured, or talking to LINE failed. */
public class LineLoginException extends RuntimeException {

    public LineLoginException(String message) {
        super(message);
    }

    public LineLoginException(String message, Throwable cause) {
        super(message, cause);
    }
}
