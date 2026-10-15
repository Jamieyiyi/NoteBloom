package com.notebloom.service;

import com.notebloom.dao.ImageContentDao;
import com.notebloom.dto.ImageResponse;

import java.util.UUID;

/**
 * Images are scoped to {@code ownerId} like notes: other accounts' images behave as if they do not exist.
 */
public interface ImageService {

    ImageResponse upload(UUID ownerId, byte[] data);

    ImageContentDao load(UUID ownerId, UUID id);
}
