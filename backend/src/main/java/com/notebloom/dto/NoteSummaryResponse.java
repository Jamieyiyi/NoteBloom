package com.notebloom.dto;

import com.notebloom.model.CategoryModel;
import com.notebloom.model.NoteModel;

import java.time.Instant;
import java.util.UUID;

public record NoteSummaryResponse(
        UUID id,
        String title,
        UUID categoryId,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteSummaryResponse from(NoteModel note) {
        CategoryModel category = note.getCategory();
        return new NoteSummaryResponse(
                note.getId(),
                note.getTitle(),
                category == null ? null : category.getId(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
