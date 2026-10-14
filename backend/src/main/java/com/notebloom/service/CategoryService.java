package com.notebloom.service;

import com.notebloom.dto.CategoryRequest;
import com.notebloom.dto.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {

    List<CategoryResponse> list();

    /** 建立分類；request.parentId 不為 null 時建立在該分類底下（最多 5 層）。 */
    CategoryResponse create(CategoryRequest request);

    /** 改名，或傳入不同的 parentId 把分類移到別的位置（連同子分類，總層數仍不可超過 5 層）。 */
    CategoryResponse update(UUID id, CategoryRequest request);

    /** 刪除分類；子分類與筆記都往上移一層（最上層分類的筆記會變成未分類）。 */
    void delete(UUID id);
}
