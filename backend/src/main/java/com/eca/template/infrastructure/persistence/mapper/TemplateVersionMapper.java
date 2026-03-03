package com.eca.template.infrastructure.persistence.mapper;

import com.eca.template.domain.model.TemplateVersion;
import com.eca.template.infrastructure.persistence.entity.TemplateVersionEntity;

/**
 * Maps between domain TemplateVersion and TemplateVersionEntity. Infrastructure only.
 */
public final class TemplateVersionMapper {

    private TemplateVersionMapper() {}

    public static TemplateVersion toDomain(TemplateVersionEntity entity) {
        // To be implemented in later slices.
        return null;
    }

    public static TemplateVersionEntity toEntity(TemplateVersion domain) {
        // To be implemented in later slices.
        return null;
    }
}
