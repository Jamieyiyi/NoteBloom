package com.notebloom.controller;

import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.dto.NoteSummaryResponse;
import com.notebloom.service.NoteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public List<NoteSummaryResponse> list() {
        return noteService.list();
    }

    @GetMapping("/{id}")
    public NoteResponse get(@PathVariable UUID id) {
        return noteService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponse create(@Valid @RequestBody NoteRequest request) {
        return noteService.create(request);
    }

    @PutMapping("/{id}")
    public NoteResponse update(@PathVariable UUID id, @Valid @RequestBody NoteRequest request) {
        return noteService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        noteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
