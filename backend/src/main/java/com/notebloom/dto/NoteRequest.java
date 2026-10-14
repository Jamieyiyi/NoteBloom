package com.notebloom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * @param categoryId 所屬分類；null 代表未分類
 */
public record NoteRequest(
        @NotBlank String title,
        @NotNull String content,
        UUID categoryId
) {
}
