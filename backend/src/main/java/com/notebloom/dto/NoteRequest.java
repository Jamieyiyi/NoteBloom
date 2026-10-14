package com.notebloom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record NoteRequest(
        @NotBlank String title,
        @NotNull String content
) {
}
