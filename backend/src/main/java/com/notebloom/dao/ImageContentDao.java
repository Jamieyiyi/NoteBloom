package com.notebloom.dao;

/** The stored bytes of an image together with the type to serve them as. */
public record ImageContentDao(String contentType, byte[] data) {
}
