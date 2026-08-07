package com.notebloom.repository;

import com.notebloom.model.NoteModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NoteRepository extends JpaRepository<NoteModel, UUID> {
}
