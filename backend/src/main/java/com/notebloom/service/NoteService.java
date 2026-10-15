package com.notebloom.service;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.dto.NoteSummaryResponse;

import java.util.List;
import java.util.UUID;

/**
 * Every operation is scoped to {@code ownerId}: notes of other accounts behave as if they do not exist.
 */
public interface NoteService {

    List<NoteSummaryResponse> list(UUID ownerId);

    NoteResponse get(UUID ownerId, UUID id);

    NoteResponse create(UUID ownerId, NoteRequest request);

    NoteResponse update(UUID ownerId, UUID id, NoteRequest request);

    void delete(UUID ownerId, UUID id);
}
