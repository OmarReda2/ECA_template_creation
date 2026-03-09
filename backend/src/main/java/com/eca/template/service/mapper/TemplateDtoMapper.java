package com.eca.template.service.mapper;

import com.eca.template.dto.LatestVersionSummaryDto;
import com.eca.template.dto.TemplateSummaryDto;
import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import org.springframework.stereotype.Component;

@Component
public class TemplateDtoMapper {


    public TemplateSummaryDto toTemplateSummary(
            TemplateEntity template,
            TemplateVersionEntity latestVersion
    ) {

        LatestVersionSummaryDto latestVersionDto = null;

        if (latestVersion != null) {
            latestVersionDto = new LatestVersionSummaryDto(
                    latestVersion.getId(),
                    latestVersion.getVersionNumber(),
                    latestVersion.getStatus(),
                    latestVersion.getCreatedAt(),
                    latestVersion.getCreatedBy(),
                    latestVersion.getSchemaHash()
            );
        }

        return new TemplateSummaryDto(
                template.getId(),
                template.getName(),
                template.getSectorCode(),
                template.getStatus(),
                template.getCreatedAt(),
                template.getCreatedBy(),
                latestVersionDto
        );
    }

//    public TemplateSummaryDto toTemplateSummary(TemplateEntity template) {
//        Optional<TemplateVersionEntity> latestOpt = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(template.getId());
//        LatestVersionSummaryDto latestVersion = latestOpt.map(v -> new LatestVersionSummaryDto(
//                v.getId(),
//                v.getVersionNumber(),
//                v.getStatus(),
//                v.getCreatedAt(),
//                v.getCreatedBy(),
//                v.getSchemaHash()
//        )).orElse(null);
//        return new TemplateSummaryDto(
//                template.getId(),
//                template.getName(),
//                template.getSectorCode(),
//                template.getStatus(),
//                template.getCreatedAt(),
//                template.getCreatedBy(),
//                latestVersion
//        );
//    }

}
