package com.notebloom.dto;

import com.notebloom.model.CategoryModel;
import com.notebloom.model.NoteModel;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String title,
        String content,
        UUID categoryId,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponse from(NoteModel note) {
        CategoryModel category = note.getCategory();
        return new NoteResponse(
                note.getId(),
                note.getTitle(),
                note.getContent(),
                category == null ? null : category.getId(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
