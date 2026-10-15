package com.notebloom.controller;

import com.notebloom.dao.ImageContentDao;
import com.notebloom.dto.ImageResponse;
import com.notebloom.security.AuthenticatedUser;
import com.notebloom.service.ImageService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageResponse upload(@AuthenticationPrincipal AuthenticatedUser user,
                                @RequestParam("file") MultipartFile file) throws IOException {
        return imageService.upload(user.id(), file.getBytes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        ImageContentDao image = imageService.load(user.id(), id);
        // An id always names the same bytes, so the browser may keep it; private keeps it out of shared caches
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable())
                .body(image.data());
    }
}
