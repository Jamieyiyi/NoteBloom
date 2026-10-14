package com.notebloom.exception;

/** 分類層級不合法：超過最大層數，或把分類移到自己 / 自己的子分類底下。 */
public class InvalidCategoryHierarchyException extends RuntimeException {

    public InvalidCategoryHierarchyException(String message) {
        super(message);
    }
}
