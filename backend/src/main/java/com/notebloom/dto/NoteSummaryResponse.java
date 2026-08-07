package com.notebloom.dto;

import com.notebloom.model.NoteModel;

import java.time.Instant;
import java.util.UUID;

public record NoteSummaryResponse(
        UUID id,
        String title,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteSummaryResponse from(NoteModel note) {
        return new NoteSummaryResponse(
                note.getId(),
                note.getTitle(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
