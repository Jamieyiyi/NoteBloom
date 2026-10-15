package com.notebloom.exception;

/** The upload is empty or not one of the supported image formats. */
public class InvalidImageException extends RuntimeException {

    public InvalidImageException(String message) {
        super(message);
    }
}
