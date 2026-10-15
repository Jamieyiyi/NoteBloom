package com.notebloom.repository;

import com.notebloom.model.CategoryModel;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<CategoryModel, UUID> {

    List<CategoryModel> findByOwnerId(UUID ownerId, Sort sort);

    Optional<CategoryModel> findByIdAndOwnerId(UUID id, UUID ownerId);

    List<CategoryModel> findByOwnerIdAndParentIsNull(UUID ownerId);

    List<CategoryModel> findByParentId(UUID parentId);

    /** 刪除分類前呼叫：把它的子分類接到 newParent（null 代表變成最上層）。 */
    @Modifying
    @Query("update CategoryModel c set c.parent = :newParent where c.parent.id = :categoryId")
    int reparentChildren(@Param("categoryId") UUID categoryId, @Param("newParent") CategoryModel newParent);
}
