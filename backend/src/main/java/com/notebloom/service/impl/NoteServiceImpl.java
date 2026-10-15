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
import com.notebloom.repository.UserRepository;
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
    private final UserRepository userRepository;

    public NoteServiceImpl(NoteRepository noteRepository, CategoryRepository categoryRepository,
                           UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteSummaryResponse> list(UUID ownerId) {
        return noteRepository.findByOwnerId(ownerId, Sort.by(Sort.Direction.DESC, "updatedAt")).stream()
                .map(NoteSummaryResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse get(UUID ownerId, UUID id) {
        return NoteResponse.from(findOrThrow(ownerId, id));
    }

    @Override
    public NoteResponse create(UUID ownerId, NoteRequest request) {
        NoteModel note = new NoteModel();
        note.setOwner(userRepository.getReferenceById(ownerId));
        applyRequest(ownerId, note, request);
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public NoteResponse update(UUID ownerId, UUID id, NoteRequest request) {
        NoteModel note = findOrThrow(ownerId, id);
        applyRequest(ownerId, note, request);
        return NoteResponse.from(noteRepository.save(note));
    }

    @Override
    public void delete(UUID ownerId, UUID id) {
        if (!noteRepository.existsByIdAndOwnerId(id, ownerId)) {
            throw new NoteNotFoundException(id);
        }
        noteRepository.deleteById(id);
    }

    private void applyRequest(UUID ownerId, NoteModel note, NoteRequest request) {
        note.setTitle(request.title());
        note.setContent(request.content());
        note.setCategory(resolveCategory(ownerId, request.categoryId()));
    }

    private CategoryModel resolveCategory(UUID ownerId, UUID categoryId) {
        if (categoryId == null) {
            return null;
        }
        // Another account's category is reported as missing, so its existence is not revealed
        return categoryRepository.findByIdAndOwnerId(categoryId, ownerId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

    private NoteModel findOrThrow(UUID ownerId, UUID id) {
        return noteRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new NoteNotFoundException(id));
    }
}
