package com.eca.template.infrastructure.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity for Template. Used only in infrastructure layer.
 * Never exposed as API DTO. Domain layer has no @Entity.
 */
@Entity
@Table(name = "templates")
public class TemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    @Column(name = "sector_code", nullable = false, columnDefinition = "TEXT")
    private String sectorCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, columnDefinition = "TEXT")
    private String createdBy;

    @PrePersist
    void onPersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSectorCode() {
        return sectorCode;
    }

    public void setSectorCode(String sectorCode) {
        this.sectorCode = sectorCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
