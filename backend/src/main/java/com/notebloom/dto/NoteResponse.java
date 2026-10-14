package com.notebloom.dto;

import com.notebloom.model.NoteModel;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String title,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponse from(NoteModel note) {
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContent(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
