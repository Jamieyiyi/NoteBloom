package com.notebloom.service;

import com.notebloom.dao.ImageContentDao;
import com.notebloom.dto.ImageResponse;
import com.notebloom.exception.ImageNotFoundException;
import com.notebloom.exception.InvalidImageException;
import com.notebloom.model.ImageModel;
import com.notebloom.model.UserModel;
import com.notebloom.repository.ImageRepository;
import com.notebloom.repository.UserRepository;
import com.notebloom.service.impl.ImageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
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
class ImageServiceImplTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 13};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16};

    @Mock
    private ImageRepository imageRepository;

    @Mock
    private UserRepository userRepository;

    private ImageServiceImpl imageService;

    @BeforeEach
    void setUp() {
        imageService = new ImageServiceImpl(imageRepository, userRepository);
    }

    @Test
    void uploadStoresDetectedTypeForOwner() {
        UserModel owner = new UserModel();
        owner.setId(OWNER_ID);
        UUID imageId = UUID.randomUUID();
        when(userRepository.getReferenceById(OWNER_ID)).thenReturn(owner);
        when(imageRepository.save(any(ImageModel.class))).thenAnswer(invocation -> {
            ImageModel image = invocation.getArgument(0);
            image.setId(imageId);
            return image;
        });

        ImageResponse response = imageService.upload(OWNER_ID, PNG);

        assertThat(response.url()).isEqualTo("/api/images/" + imageId);
        verify(imageRepository).save(argThat(image ->
                image.getOwner() == owner && image.getContentType().equals("image/png") && image.getData() == PNG));
    }

    @Test
    void uploadRejectsFilesThatAreNotSupportedImages() {
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
                .getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> imageService.upload(OWNER_ID, svg)).isInstanceOf(InvalidImageException.class);
        assertThatThrownBy(() -> imageService.upload(OWNER_ID, new byte[0])).isInstanceOf(InvalidImageException.class);
        verify(imageRepository, never()).save(any());
    }

    @Test
    void detectsSupportedFormatsFromSignature() {
        when(imageRepository.save(any(ImageModel.class))).thenAnswer(invocation -> {
            ImageModel image = invocation.getArgument(0);
            image.setId(UUID.randomUUID());
            return image;
        });
        byte[] gif = "GIF89a....".getBytes(StandardCharsets.US_ASCII);
        byte[] webp = "RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.US_ASCII);

        imageService.upload(OWNER_ID, JPEG);
        imageService.upload(OWNER_ID, gif);
        imageService.upload(OWNER_ID, webp);

        verify(imageRepository).save(argThat(image -> image != null && "image/jpeg".equals(image.getContentType())));
        verify(imageRepository).save(argThat(image -> image != null && "image/gif".equals(image.getContentType())));
        verify(imageRepository).save(argThat(image -> image != null && "image/webp".equals(image.getContentType())));
    }

    @Test
    void loadReturnsOwnImage() {
        UUID id = UUID.randomUUID();
        ImageModel image = new ImageModel();
        image.setContentType("image/png");
        image.setData(PNG);
        when(imageRepository.findByIdAndOwnerId(id, OWNER_ID)).thenReturn(Optional.of(image));

        ImageContentDao content = imageService.load(OWNER_ID, id);

        assertThat(content.contentType()).isEqualTo("image/png");
        assertThat(content.data()).isEqualTo(PNG);
    }

    @Test
    void loadTreatsOtherAccountsImagesAsMissing() {
        UUID id = UUID.randomUUID();
        when(imageRepository.findByIdAndOwnerId(id, OWNER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> imageService.load(OWNER_ID, id)).isInstanceOf(ImageNotFoundException.class);
    }
}
