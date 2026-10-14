package com.notebloom.repository;

import com.notebloom.model.CategoryModel;
import com.notebloom.model.NoteModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NoteRepository extends JpaRepository<NoteModel, UUID> {

    /** 刪除分類前呼叫：把該分類底下的筆記移到 target（null 代表未分類）。 */
    @Modifying
    @Query("update NoteModel n set n.category = :target where n.category.id = :categoryId")
    int moveCategory(@Param("categoryId") UUID categoryId, @Param("target") CategoryModel target);
}
