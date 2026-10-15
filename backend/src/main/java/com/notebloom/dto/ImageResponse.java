package com.notebloom.dto;

import java.util.UUID;

/** Result of an upload; {@code url} is what the note's Markdown should reference. */
public record ImageResponse(UUID id, String url) {

    public static ImageResponse of(UUID id) {
        return new ImageResponse(id, "/api/images/" + id);
    }
}
