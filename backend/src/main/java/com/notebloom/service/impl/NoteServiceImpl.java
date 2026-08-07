package com.notebloom.service.impl;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.dto.NoteSummaryResponse;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.model.NoteModel;
import com.notebloom.repository.NoteRepository;
import com.notebloom.service.NoteService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NoteServiceImpl implements NoteService {

    private final NoteRepository noteRepository;

    public NoteServiceImpl(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> list() {
        return noteRepository.findAll().stream()
                .map(NoteSummaryResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse get(UUID id) {
        return NoteResponse.from(findOrThrow(id));
    }

    @Override
    public NoteResponse create(NoteRequest request) {
        NoteModel note = new NoteModel();
        note.setTitle(request.title());
        note.setContentJson(request.contentJson());
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public NoteResponse update(UUID id, NoteRequest request) {
        NoteModel note = findOrThrow(id);
        note.setTitle(request.title());
        note.setContentJson(request.contentJson());
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public void delete(UUID id) {
        if (!noteRepository.existsById(id)) {
            throw new NoteNotFoundException(id);
        }
        noteRepository.deleteById(id);
    }

    private NoteModel findOrThrow(UUID id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new NoteNotFoundException(id));
    }
}
