package com.notebloom.exception;

/** The LINE account is already bound to a different NoteBloom account. */
public class LineAccountAlreadyLinkedException extends RuntimeException {

    public LineAccountAlreadyLinkedException() {
        super("這個 LINE 帳號已經綁定其他 NoteBloom 帳號");
    }
}
