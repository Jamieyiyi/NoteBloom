package com.notebloom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * @param parentId 父分類；null 代表最上層。更新時傳入不同的 parentId 就是移動分類
 */
public record CategoryRequest(
        @NotBlank @Size(max = 100) String name,
        UUID parentId
) {
}
