package com.eca.submission.repository;

import com.eca.submission.entity.SubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubmissionJpaRepository extends JpaRepository<SubmissionEntity, UUID> {
    List<SubmissionEntity> findAllByOrderByCreatedAtDesc();
}
