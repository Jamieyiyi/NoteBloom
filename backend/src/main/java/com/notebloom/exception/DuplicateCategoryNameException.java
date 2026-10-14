package com.notebloom.exception;

public class DuplicateCategoryNameException extends RuntimeException {

    public DuplicateCategoryNameException(String name) {
        super("Category already exists: " + name);
    }
}
