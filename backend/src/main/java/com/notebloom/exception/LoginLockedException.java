package com.notebloom.exception;

import java.time.Duration;

public class LoginLockedException extends RuntimeException {

    public LoginLockedException(Duration remaining) {
        super("登入失敗次數過多，請在 " + Math.max(1, remaining.toMinutes() + 1) + " 分鐘後再試");
    }
}
