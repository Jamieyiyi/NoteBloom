package com.notebloom.exception;

public class DuplicateUsernameException extends RuntimeException {

    public DuplicateUsernameException(String username) {
        super("帳號「" + username + "」已經存在");
    }
}
