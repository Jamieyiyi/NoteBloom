package com.notebloom.repository;

import com.notebloom.model.ImageModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ImageRepository extends JpaRepository<ImageModel, UUID> {

    Optional<ImageModel> findByIdAndOwnerId(UUID id, UUID ownerId);
}
