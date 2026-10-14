package com.notebloom.service.impl;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.dto.NoteSummaryResponse;
import com.notebloom.exception.CategoryNotFoundException;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.model.CategoryModel;
import com.notebloom.model.NoteModel;
import com.notebloom.repository.CategoryRepository;
import com.notebloom.repository.NoteRepository;
import com.notebloom.service.NoteService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NoteServiceImpl implements NoteService {

    private final NoteRepository noteRepository;
    private final CategoryRepository categoryRepository;

    public NoteServiceImpl(NoteRepository noteRepository, CategoryRepository categoryRepository) {
        this.noteRepository = noteRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> list() {
        return noteRepository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt")).stream()
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
        applyRequest(note, request);
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public NoteResponse update(UUID id, NoteRequest request) {
        NoteModel note = findOrThrow(id);
        applyRequest(note, request);
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public void delete(UUID id) {
        if (!noteRepository.existsById(id)) {
            throw new NoteNotFoundException(id);
        }
        noteRepository.deleteById(id);
    }

    private void applyRequest(NoteModel note, NoteRequest request) {
        note.setTitle(request.title());
        note.setContent(request.content());
        note.setCategory(resolveCategory(request.categoryId()));
    }

    private CategoryModel resolveCategory(UUID categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

    private NoteModel findOrThrow(UUID id) {
        return noteRepository.findById(id)
                .orElseThrow(() -> new NoteNotFoundException(id));
    }
}
