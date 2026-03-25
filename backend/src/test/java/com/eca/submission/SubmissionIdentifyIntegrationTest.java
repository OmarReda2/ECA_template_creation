package com.eca.submission;

import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateJpaRepository;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.eca.submission.controller.SubmissionController;
import com.eca.submission.model.SubmissionIdentifyStatus;
import com.eca.submission.parser.SubmissionWorkbookParser;
import com.eca.submission.service.SubmissionStructureValidationService;
import com.eca.submission.service.SubmissionService;
import com.eca.template.TemplateCreationServiceApplication;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = TemplateCreationServiceApplication.class)
@Import({
        SubmissionService.class,
        SubmissionStructureValidationService.class,
        SubmissionWorkbookParser.class,
        SubmissionController.class
})
class SubmissionIdentifyIntegrationTest {

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
    private SubmissionService submissionService;

    @Autowired
    private TemplateJpaRepository templateRepository;

    @Autowired
    private TemplateVersionJpaRepository versionRepository;

    @Test
    void identify_returnsExactMatch() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = submissionService.identify(workbookFile(version.getTemplate().getId(), version.getId(), version.getVersionNumber(), "hash-1"));

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.EXACT_MATCH);
        assertThat(response.resolvedVersion()).isNotNull();
        assertThat(response.messages()).isEmpty();
    }

    @Test
    void identify_returnsMetadataMissing() throws Exception {
        var response = submissionService.identify(workbookWithoutMetadata());

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.METADATA_MISSING);
    }

    @Test
    void identify_returnsMetadataInvalid() throws Exception {
        MockMultipartFile file = workbookWithRawMetadata(
                "bad-template-id",
                "bad-version-id",
                "not-a-number",
                ""
        );

        var response = submissionService.identify(file);

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.METADATA_INVALID);
        assertThat(response.messages()).isNotEmpty();
    }

    @Test
    void identify_returnsVersionNotFound() throws Exception {
        MockMultipartFile file = workbookWithRawMetadata(
                UUID.randomUUID().toString(),
                UUID.randomUUID().toString(),
                "1",
                "hash-1"
        );

        var response = submissionService.identify(file);

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.VERSION_NOT_FOUND);
    }

    @Test
    void identify_returnsHashMismatch() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = submissionService.identify(workbookFile(version.getTemplate().getId(), version.getId(), version.getVersionNumber(), "hash-2"));

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.HASH_MISMATCH);
        assertThat(response.resolvedVersion()).isNotNull();
    }

    @Test
    void identify_rejectsUnsupportedFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "not-excel.txt",
                "text/plain",
                "hello".getBytes()
        );

        try {
            submissionService.identify(file);
        } catch (Exception ex) {
            assertThat(ex).hasMessageContaining("Only .xlsx workbooks are supported.");
        }
    }

    @Test
    void identify_addsPendingHashWarning() throws Exception {
        TemplateVersionEntity version = saveVersion("PENDING_HASH");

        var response = submissionService.identify(workbookFile(version.getTemplate().getId(), version.getId(), version.getVersionNumber(), "PENDING_HASH"));

        assertThat(response.status()).isEqualTo(SubmissionIdentifyStatus.EXACT_MATCH);
        assertThat(response.messages()).contains("Schema hash comparison is based on a non-final 'PENDING_HASH' value.");
    }

    private TemplateVersionEntity saveVersion(String schemaHash) {
        TemplateEntity template = new TemplateEntity();
        template.setName("Submission Template");
        template.setSectorCode("S1");
        template.setStatus("DRAFT");
        template.setCreatedBy("u");
        template = templateRepository.saveAndFlush(template);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setTemplate(template);
        version.setVersionNumber(1);
        version.setStatus("DRAFT");
        version.setSchemaJson(new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode());
        version.setSchemaHash(schemaHash);
        version.setCreatedBy("u");
        return versionRepository.saveAndFlush(version);
    }

    private MockMultipartFile workbookFile(UUID templateId, UUID versionId, int versionNumber, String schemaHash) throws Exception {
        return workbookWithRawMetadata(templateId.toString(), versionId.toString(), String.valueOf(versionNumber), schemaHash);
    }

    private MockMultipartFile workbookWithoutMetadata() throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Data");
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "submission.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }

    private MockMultipartFile workbookWithRawMetadata(String templateId, String versionId, String versionNumber, String schemaHash) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet meta = workbook.createSheet("__metadata__");
            setMetadataRow(meta, 0, "template_id", templateId);
            setMetadataRow(meta, 1, "version_id", versionId);
            setMetadataRow(meta, 2, "version_number", versionNumber);
            setMetadataRow(meta, 3, "schema_hash", schemaHash);
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "submission.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }

    private void setMetadataRow(Sheet sheet, int rowIndex, String key, String value) {
        var row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(value);
    }
}


