package com.notebloom.service.impl;

import com.notebloom.dto.CategoryRequest;
import com.notebloom.dto.CategoryResponse;
import com.notebloom.exception.CategoryNotFoundException;
import com.notebloom.exception.DuplicateCategoryNameException;
import com.notebloom.exception.InvalidCategoryHierarchyException;
import com.notebloom.model.CategoryModel;
import com.notebloom.repository.CategoryRepository;
import com.notebloom.repository.NoteRepository;
import com.notebloom.service.CategoryService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final NoteRepository noteRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository, NoteRepository noteRepository) {
        this.categoryRepository = categoryRepository;
        this.noteRepository = noteRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categoryRepository.findAll(Sort.by("createdAt")).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Override
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        CategoryModel parent = findParent(request.parentId());
        if (depthOf(parent) + 1 > CategoryModel.MAX_DEPTH) {
            throw new InvalidCategoryHierarchyException("分類最多只能有 " + CategoryModel.MAX_DEPTH + " 層");
        }
        ensureUniqueAmongSiblings(name, parent, null);

        CategoryModel category = new CategoryModel();
        category.setName(name);
        category.setParent(parent);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Override
    public CategoryResponse update(UUID id, CategoryRequest request) {
        CategoryModel category = findOrThrow(id);
        String name = request.name().trim();
        CategoryModel parent = findParent(request.parentId());

        if (!Objects.equals(idOf(parent), idOf(category.getParent()))) {
            ensureCanMove(category, parent);
        }
        ensureUniqueAmongSiblings(name, parent, id);

        category.setName(name);
        category.setParent(parent);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Override
    public void delete(UUID id) {
        CategoryModel category = findOrThrow(id);
        CategoryModel parent = category.getParent();
        noteRepository.moveCategory(id, parent);
        categoryRepository.reparentChildren(id, parent);
        categoryRepository.delete(category);
    }

    /** 不能移到自己或自己的子孫底下，移動後整棵子樹的最深處也不能超過最大層數。 */
    private void ensureCanMove(CategoryModel category, CategoryModel newParent) {
        for (CategoryModel ancestor = newParent; ancestor != null; ancestor = ancestor.getParent()) {
            if (ancestor.getId().equals(category.getId())) {
                throw new InvalidCategoryHierarchyException("不能把分類移到它自己或它的子分類底下");
            }
        }
        if (depthOf(newParent) + subtreeHeight(category) > CategoryModel.MAX_DEPTH) {
            throw new InvalidCategoryHierarchyException("移動後會超過 " + CategoryModel.MAX_DEPTH + " 層");
        }
    }

    private void ensureUniqueAmongSiblings(String name, CategoryModel parent, UUID excludeId) {
        List<CategoryModel> siblings = parent == null
                ? categoryRepository.findByParentIsNull()
                : categoryRepository.findByParentId(parent.getId());
        boolean duplicate = siblings.stream()
                .anyMatch(sibling -> sibling.getName().equalsIgnoreCase(name) && !sibling.getId().equals(excludeId));
        if (duplicate) {
            throw new DuplicateCategoryNameException(name);
        }
    }

    /** 最上層為 1；null（還沒有分類）為 0。 */
    private int depthOf(CategoryModel category) {
        int depth = 0;
        for (CategoryModel current = category; current != null; current = current.getParent()) {
            depth++;
        }
        return depth;
    }

    /** 自己算 1 層，加上最深的子孫層數。 */
    private int subtreeHeight(CategoryModel category) {
        return 1 + categoryRepository.findByParentId(category.getId()).stream()
                .mapToInt(this::subtreeHeight)
                .max()
                .orElse(0);
    }

    private CategoryModel findParent(UUID parentId) {
        return parentId == null ? null : findOrThrow(parentId);
    }

    private CategoryModel findOrThrow(UUID id) {
        return categoryRepository.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
    }

    private static UUID idOf(CategoryModel category) {
        return category == null ? null : category.getId();
    }
}
