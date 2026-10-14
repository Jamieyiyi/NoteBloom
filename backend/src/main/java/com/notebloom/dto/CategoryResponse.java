package com.notebloom.dto;

import com.notebloom.model.CategoryModel;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        UUID parentId,
        Instant createdAt
) {
    public static CategoryResponse from(CategoryModel category) {
        CategoryModel parent = category.getParent();
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                parent == null ? null : parent.getId(),
                category.getCreatedAt()
        );
    }
}
