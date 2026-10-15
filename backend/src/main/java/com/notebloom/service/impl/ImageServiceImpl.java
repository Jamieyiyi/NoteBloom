package com.notebloom.service.impl;

import com.notebloom.dao.ImageContentDao;
import com.notebloom.dto.ImageResponse;
import com.notebloom.exception.ImageNotFoundException;
import com.notebloom.exception.InvalidImageException;
import com.notebloom.model.ImageModel;
import com.notebloom.repository.ImageRepository;
import com.notebloom.repository.UserRepository;
import com.notebloom.service.ImageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@Transactional
public class ImageServiceImpl implements ImageService {

    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    public ImageServiceImpl(ImageRepository imageRepository, UserRepository userRepository) {
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ImageResponse upload(UUID ownerId, byte[] data) {
        if (data == null || data.length == 0) {
            throw new InvalidImageException("圖片是空的");
        }
        ImageModel image = new ImageModel();
        image.setOwner(userRepository.getReferenceById(ownerId));
        image.setContentType(detectContentType(data));
        image.setData(data);
        return ImageResponse.of(imageRepository.save(image).getId());
    }

    @Override
    @Transactional(readOnly = true)
    public ImageContentDao load(UUID ownerId, UUID id) {
        ImageModel image = imageRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ImageNotFoundException(id));
        return new ImageContentDao(image.getContentType(), image.getData());
    }

    /**
     * Identifies the format from the file signature. The type the browser claims is ignored, so nothing
     * but these raster formats is ever served back (SVG in particular could carry script).
     */
    static String detectContentType(byte[] data) {
        if (startsWith(data, 0, new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})) {
            return "image/png";
        }
        if (startsWith(data, 0, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) {
            return "image/jpeg";
        }
        if (startsWith(data, 0, ascii("GIF87a")) || startsWith(data, 0, ascii("GIF89a"))) {
            return "image/gif";
        }
        if (startsWith(data, 0, ascii("RIFF")) && startsWith(data, 8, ascii("WEBP"))) {
            return "image/webp";
        }
        throw new InvalidImageException("只支援 PNG、JPEG、GIF、WebP 圖片");
    }

    private static boolean startsWith(byte[] data, int offset, byte[] signature) {
        if (data.length < offset + signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (data[offset + i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }
}
