package com.notebloom.service;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.dto.NoteSummaryResponse;

import java.util.List;
import java.util.UUID;

public interface NoteService {

    List<NoteSummaryResponse> list();

    NoteResponse get(UUID id);

    NoteResponse create(NoteRequest request);

    NoteResponse update(UUID id, NoteRequest request);

    void delete(UUID id);
}
