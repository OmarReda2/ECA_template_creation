package com.eca.template.repository;

import com.eca.template.entity.TemplateVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TemplateVersionJpaRepository extends JpaRepository<TemplateVersionEntity, UUID> {

    List<TemplateVersionEntity> findByTemplate_IdOrderByVersionNumberDesc(UUID templateId);

    Optional<TemplateVersionEntity> findByTemplate_IdAndVersionNumber(UUID templateId, int versionNumber);

    Optional<TemplateVersionEntity> findTopByTemplate_IdOrderByVersionNumberDesc(UUID templateId);
}
