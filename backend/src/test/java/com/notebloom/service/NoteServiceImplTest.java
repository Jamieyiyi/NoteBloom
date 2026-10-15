package com.notebloom.service;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.exception.CategoryNotFoundException;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.model.NoteModel;
import com.notebloom.model.UserModel;
import com.notebloom.repository.CategoryRepository;
import com.notebloom.repository.NoteRepository;
import com.notebloom.repository.UserRepository;
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
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteServiceImplTest {

    private static final UUID OWNER_ID = UUID.randomUUID();

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    private NoteServiceImpl noteService;

    @BeforeEach
    void setUp() {
        noteService = new NoteServiceImpl(noteRepository, categoryRepository, userRepository);
    }

    @Test
    void createSavesNoteForOwner() {
        UserModel owner = new UserModel();
        owner.setId(OWNER_ID);
        when(userRepository.getReferenceById(OWNER_ID)).thenReturn(owner);
        when(noteRepository.save(any(NoteModel.class))).thenAnswer(invocation -> {
            NoteModel note = invocation.getArgument(0);
            note.setId(UUID.randomUUID());
            note.setCreatedAt(Instant.now());
            note.setUpdatedAt(Instant.now());
            return note;
        });

        NoteResponse response = noteService.create(OWNER_ID, new NoteRequest("My Note", "# Hello", null));

        assertThat(response.title()).isEqualTo("My Note");
        assertThat(response.content()).isEqualTo("# Hello");
        assertThat(response.id()).isNotNull();
        verify(noteRepository).save(argThat(note -> note.getOwner() == owner));
    }

    @Test
    void getThrowsWhenNoteBelongsToSomeoneElse() {
        UUID id = UUID.randomUUID();
        when(noteRepository.findByIdAndOwnerId(id, OWNER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.get(OWNER_ID, id))
                .isInstanceOf(NoteNotFoundException.class);
    }

    @Test
    void updateCannotMoveNoteIntoAnotherUsersCategory() {
        UUID noteId = UUID.randomUUID();
        UUID foreignCategoryId = UUID.randomUUID();
        when(noteRepository.findByIdAndOwnerId(noteId, OWNER_ID)).thenReturn(Optional.of(new NoteModel()));
        when(categoryRepository.findByIdAndOwnerId(foreignCategoryId, OWNER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.update(OWNER_ID, noteId, new NoteRequest("T", "", foreignCategoryId)))
                .isInstanceOf(CategoryNotFoundException.class);
        verify(noteRepository, never()).save(any());
    }

    @Test
    void deleteThrowsWhenNoteBelongsToSomeoneElse() {
        UUID id = UUID.randomUUID();
        when(noteRepository.existsByIdAndOwnerId(id, OWNER_ID)).thenReturn(false);

        assertThatThrownBy(() -> noteService.delete(OWNER_ID, id))
                .isInstanceOf(NoteNotFoundException.class);
        verify(noteRepository, never()).deleteById(any());
    }
}
