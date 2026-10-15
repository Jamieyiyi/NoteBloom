package com.notebloom.controller;

import com.notebloom.config.SecurityConfig;
import com.notebloom.dto.NoteRequest;
import com.notebloom.dto.NoteResponse;
import com.notebloom.exception.NoteNotFoundException;
import com.notebloom.model.UserRole;
import com.notebloom.security.AccountUserDetailsService;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.NoteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoteController.class)
@Import(SecurityConfig.class)
class NoteControllerTest {

    private static final AuthenticatedUser USER =
            new AuthenticatedUser(UUID.randomUUID(), "alice", "Alice", UserRole.USER, null, true);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NoteService noteService;

    @MockitoBean
    private AccountUserDetailsService userDetailsService;

    @Test
    void listReturns401WithoutLogin() throws Exception {
        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(noteService);
    }

    @Test
    void listIsScopedToLoggedInUser() throws Exception {
        mockMvc.perform(get("/api/notes").with(user(USER)))
                .andExpect(status().isOk());

        verify(noteService).list(USER.id());
    }

    @Test
    void getReturns404WhenNoteMissing() throws Exception {
        UUID id = UUID.randomUUID();
        when(noteService.get(USER.id(), id)).thenThrow(new NoteNotFoundException(id));

        mockMvc.perform(get("/api/notes/{id}", id).with(user(USER)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createReturns201WithBody() throws Exception {
        NoteRequest request = new NoteRequest("Hello", "# Hello", null);
        NoteResponse response = new NoteResponse(UUID.randomUUID(), "Hello", "# Hello", null, Instant.now(), Instant.now());
        when(noteService.create(eq(USER.id()), any(NoteRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/notes")
                        .with(user(USER))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void createReturns403WithoutCsrfToken() throws Exception {
        NoteRequest request = new NoteRequest("Hello", "# Hello", null);

        mockMvc.perform(post("/api/notes")
                        .with(user(USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(noteService);
    }

    @Test
    void createReturns400WhenTitleBlank() throws Exception {
        NoteRequest request = new NoteRequest(" ", "# Hello", null);

        mockMvc.perform(post("/api/notes")
                        .with(user(USER))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
