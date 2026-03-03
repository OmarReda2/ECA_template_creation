package com.eca.template.infrastructure.persistence.repository;

import com.eca.template.infrastructure.persistence.entity.TemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * JPA repository for Template. Used by application layer via port or direct interface.
 */
public interface TemplateJpaRepository extends JpaRepository<TemplateEntity, UUID> {
}
