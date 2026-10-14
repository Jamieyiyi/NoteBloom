package com.notebloom.service;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.model.NoteModel;
import com.notebloom.repository.CategoryRepository;
import com.notebloom.repository.NoteRepository;
import com.notebloom.service.impl.NoteServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceImplTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private NoteServiceImpl noteService;

    @BeforeEach
    void setUp() {
        noteService = new NoteServiceImpl(noteRepository, categoryRepository);
    }

    @Test
    void createSavesNoteAndReturnsResponse() {
        NoteRequest request = new NoteRequest("My Note", "# Hello", null);
        when(noteRepository.save(any(NoteModel.class))).thenAnswer(invocation -> {
            NoteModel note = invocation.getArgument(0);
            note.setId(UUID.randomUUID());
            note.setCreatedAt(Instant.now());
            note.setUpdatedAt(Instant.now());
            return note;
        });

        NoteResponse response = noteService.create(request);

        assertThat(response.title()).isEqualTo("My Note");
        assertThat(response.content()).isEqualTo("# Hello");
        assertThat(response.id()).isNotNull();
    }

    @Test
    void getThrowsWhenNoteMissing() {
        UUID id = UUID.randomUUID();
        when(noteRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.get(id))
                .isInstanceOf(NoteNotFoundException.class);
    }

    @Test
    void deleteThrowsWhenNoteMissing() {
        UUID id = UUID.randomUUID();
        when(noteRepository.existsById(id)).thenReturn(false);

        assertThatThrownBy(() -> noteService.delete(id))
                .isInstanceOf(NoteNotFoundException.class);
    }
}
