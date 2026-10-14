package com.notebloom.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.service.NoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NoteService noteService;

    @Test
    void getReturns404WhenNoteMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(noteService.get(id)).thenThrow(new NoteNotFoundException(id));

        mockMvc.perform(get("/api/notes/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReturns201WithBody() throws Exception {
        NoteRequest request = new NoteRequest("Hello", "# Hello");
        NoteResponse response = new NoteResponse(UUID.randomUUID(), "Hello", "# Hello", Instant.now(), Instant.now());
        when(noteService.create(any(NoteRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void createReturns400WhenTitleBlank() throws Exception {
        NoteRequest request = new NoteRequest(" ", "# Hello");

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
