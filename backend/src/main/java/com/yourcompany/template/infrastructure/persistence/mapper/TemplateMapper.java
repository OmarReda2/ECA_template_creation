package com.yourcompany.template.infrastructure.persistence.mapper;

import com.yourcompany.template.domain.model.Template;
import com.yourcompany.template.infrastructure.persistence.entity.TemplateEntity;

/**
 * Maps between domain Template and TemplateEntity. Infrastructure only.
 */
public final class TemplateMapper {

    private TemplateMapper() {}

    public static Template toDomain(TemplateEntity entity) {
        // To be implemented in later slices.
        return null;
    }

    public static TemplateEntity toEntity(Template domain) {
        // To be implemented in later slices.
        return null;
    }
}
