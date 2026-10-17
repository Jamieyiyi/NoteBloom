package com.notebloom.dto;

/** Login methods available on this server, shown on the login page before anyone is logged in. */
public record AuthOptionsResponse(boolean lineLoginEnabled) {
}
