package com.notebloom.dto;

/** LINE page the browser should open to approve binding the LINE account. */
public record LineAuthorizeResponse(String authorizeUrl) {
}
