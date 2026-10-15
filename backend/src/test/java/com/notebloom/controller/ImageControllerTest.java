package com.notebloom.controller;

import com.notebloom.config.SecurityConfig;
import com.notebloom.dao.ImageContentDao;
import com.notebloom.dto.ImageResponse;
import com.notebloom.exception.ImageNotFoundException;
import com.notebloom.exception.InvalidImageException;
import com.notebloom.model.UserRole;
import com.notebloom.security.AccountUserDetailsService;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.ImageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ImageController.class)
@Import(SecurityConfig.class)
class ImageControllerTest {

    private static final AuthenticatedUser USER =
            new AuthenticatedUser(UUID.randomUUID(), "alice", "Alice", UserRole.USER, null, true);
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageService imageService;

    @MockitoBean
    private AccountUserDetailsService userDetailsService;

    @Test
    void uploadReturns401WithoutLogin() throws Exception {
        mockMvc.perform(multipart("/api/images").file(new MockMultipartFile("file", "a.png", "image/png", PNG)).with(csrf()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(imageService);
    }

    @Test
    void uploadReturns201WithUrl() throws Exception {
        UUID id = UUID.randomUUID();
        when(imageService.upload(eq(USER.id()), any())).thenReturn(ImageResponse.of(id));

        mockMvc.perform(multipart("/api/images").file(new MockMultipartFile("file", "a.png", "image/png", PNG))
                        .with(user(USER)).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("/api/images/" + id));
    }

    @Test
    void uploadRejectsUnsupportedFileWith400() throws Exception {
        when(imageService.upload(eq(USER.id()), any())).thenThrow(new InvalidImageException("只支援 PNG、JPEG、GIF、WebP 圖片"));

        mockMvc.perform(multipart("/api/images").file(new MockMultipartFile("file", "a.svg", "image/svg+xml", new byte[]{'<'}))
                        .with(user(USER)).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("只支援 PNG、JPEG、GIF、WebP 圖片"));
    }

    @Test
    void getServesBytesWithStoredType() throws Exception {
        UUID id = UUID.randomUUID();
        when(imageService.load(USER.id(), id)).thenReturn(new ImageContentDao("image/png", PNG));

        mockMvc.perform(get("/api/images/{id}", id).with(user(USER)))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(content().bytes(PNG))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void getReturns404ForOtherAccountsImage() throws Exception {
        UUID id = UUID.randomUUID();
        when(imageService.load(USER.id(), id)).thenThrow(new ImageNotFoundException(id));

        mockMvc.perform(get("/api/images/{id}", id).with(user(USER)))
                .andExpect(status().isNotFound());
    }
}
