package com.eca.template.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.domain.exception.VersionNotEditableException;
import com.eca.template.infrastructure.persistence.entity.TemplateEntity;
import com.eca.template.infrastructure.persistence.entity.TemplateVersionEntity;
import com.eca.template.infrastructure.persistence.repository.TemplateJpaRepository;
import com.eca.template.infrastructure.persistence.repository.TemplateVersionJpaRepository;
import com.eca.template.infrastructure.validation.SchemaValidatorImpl;
import com.eca.template.infrastructure.hashing.JsonCanonicalizerImpl;
import com.eca.template.infrastructure.hashing.SchemaHasherImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Editability rule: only the latest version is editable.
 * Create v1 and v2; PUT schema on v1 throws VersionNotEditableException (409).
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        TemplateApplicationService.class,
        SchemaValidatorImpl.class,
        JsonCanonicalizerImpl.class,
        SchemaHasherImpl.class,
        UpdateSchemaEditabilityTest.TestConfig.class
})
class UpdateSchemaEditabilityTest {

    @Configuration
    static class TestConfig {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:15-alpine"))
            .withDatabaseName("template_db")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    TemplateApplicationService templateService;
    @Autowired
    TemplateJpaRepository templateRepository;
    @Autowired
    TemplateVersionJpaRepository versionRepository;

    @Test
    void updateNonLatestVersion_returns409() throws Exception {
        TemplateEntity template = new TemplateEntity();
        template.setName("T");
        template.setSectorCode("S1");
        template.setStatus("DRAFT");
        template.setCreatedBy("u");
        template = templateRepository.saveAndFlush(template);

        TemplateVersionEntity v1 = new TemplateVersionEntity();
        v1.setTemplate(template);
        v1.setVersionNumber(1);
        v1.setStatus("READ_ONLY");
        v1.setSchemaJson(objectMapper.readTree("{\"sectorCode\":\"S1\",\"tables\":[]}"));
        v1.setSchemaHash("h1");
        v1.setCreatedBy("u");
        v1 = versionRepository.saveAndFlush(v1);

        TemplateVersionEntity v2 = new TemplateVersionEntity();
        v2.setTemplate(template);
        v2.setVersionNumber(2);
        v2.setStatus("DRAFT");
        v2.setSchemaJson(objectMapper.readTree("{\"sectorCode\":\"S1\",\"tables\":[]}"));
        v2.setSchemaHash("h2");
        v2.setCreatedBy("u");
        v2 = versionRepository.saveAndFlush(v2);

        JsonNode newSchema = objectMapper.readTree("{\"sectorCode\":\"S1\",\"tables\":[]}");
        java.util.UUID v1Id = v1.getId();

        assertThatThrownBy(() -> templateService.updateSchema(v1Id, newSchema))
                .isInstanceOf(VersionNotEditableException.class)
                .hasMessageContaining("not the latest");
    }
}
