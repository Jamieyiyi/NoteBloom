package com.notebloom.repository;

import com.notebloom.model.UserModel;
import com.notebloom.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserModel, UUID> {

    Optional<UserModel> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<UserModel> findByLineUserId(String lineUserId);

    List<UserModel> findByRoleAndPasswordHashIsNull(UserRole role);
}
