package com.eca.template.persistence.repository;

import com.eca.template.repository.TemplateJpaRepository;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Minimal repository integration test: create Template, create TemplateVersion v1
 * with schema_json placeholder and schema_hash 'PENDING_HASH', persist and read back.
 * Uses Testcontainers Postgres for JSONB correctness.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TemplatePersistenceTest {

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
    TemplateJpaRepository templateRepository;

    @Autowired
    TemplateVersionJpaRepository versionRepository;

    @Test
    void persistTemplateAndVersionThenReadBack() throws Exception {
        TemplateEntity template = new TemplateEntity();
        template.setName("Test Template");
        template.setSectorCode("S1");
        template.setStatus("DRAFT");
        template.setCreatedBy("system@test");
        template = templateRepository.saveAndFlush(template);
        assertThat(template.getId()).isNotNull();

        JsonNode minimalSchema = objectMapper.readTree("{\"fields\":[],\"version\":1}");
        TemplateVersionEntity v1 = new TemplateVersionEntity();
        v1.setTemplate(template);
        v1.setVersionNumber(1);
        v1.setStatus("DRAFT");
        v1.setSchemaJson(minimalSchema);
        v1.setSchemaHash("PENDING_HASH");
        v1.setCreatedBy("system@test");
        v1 = versionRepository.saveAndFlush(v1);
        assertThat(v1.getId()).isNotNull();
        assertThat(v1.getSchemaHash()).isEqualTo("PENDING_HASH");

        Optional<TemplateEntity> foundTemplate = templateRepository.findById(template.getId());
        assertThat(foundTemplate).isPresent();
        assertThat(foundTemplate.get().getName()).isEqualTo("Test Template");

        List<TemplateVersionEntity> versions = versionRepository.findByTemplate_IdOrderByVersionNumberDesc(template.getId());
        assertThat(versions).hasSize(1);
        assertThat(versions.get(0).getVersionNumber()).isEqualTo(1);
        assertThat(versions.get(0).getSchemaJson()).isEqualTo(minimalSchema);
        assertThat(versions.get(0).getSchemaHash()).isEqualTo("PENDING_HASH");

        Optional<TemplateVersionEntity> latest = versionRepository.findTopByTemplate_IdOrderByVersionNumberDesc(template.getId());
        assertThat(latest).isPresent();
        assertThat(latest.get().getVersionNumber()).isEqualTo(1);
    }
}
