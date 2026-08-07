package com.notebloom.dto;

import com.notebloom.model.NoteModel;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String title,
        String contentJson,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponse from(NoteModel note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContentJson(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
