package com.yourcompany.template.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.template.infrastructure.excel.SXSSFExcelWorkbookBuilder;
import com.yourcompany.template.infrastructure.persistence.entity.TemplateEntity;
import com.yourcompany.template.infrastructure.persistence.entity.TemplateVersionEntity;
import com.yourcompany.template.infrastructure.persistence.repository.TemplateJpaRepository;
import com.yourcompany.template.infrastructure.persistence.repository.TemplateVersionJpaRepository;
import com.yourcompany.template.infrastructure.validation.SchemaValidatorImpl;
import com.yourcompany.template.infrastructure.hashing.JsonCanonicalizerImpl;
import com.yourcompany.template.infrastructure.hashing.SchemaHasherImpl;
import org.apache.poi.ss.usermodel.SheetVisibility;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Export smoke test: export returns a readable XLSX with expected sheets and hidden __metadata__.
 * Schema: 2 tables (2 sheets), 1 required field, 1 enum field.
 * Asserts: workbook parses, sheet names include data sheets + __metadata__, __metadata__ is VERY_HIDDEN, header has required marker.
 */
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        TemplateApplicationService.class,
        SchemaValidatorImpl.class,
        JsonCanonicalizerImpl.class,
        SchemaHasherImpl.class,
        SXSSFExcelWorkbookBuilder.class,
        ExportExcelTest.TestConfig.class
})
class ExportExcelTest {

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
    void exportWorkbook_hasExpectedSheets_metadataHidden_requiredHeaderMarker() throws Exception {
        TemplateEntity template = new TemplateEntity();
        template.setName("Export Test");
        template.setSectorCode("S1");
        template.setStatus("DRAFT");
        template.setCreatedBy("u");
        template = templateRepository.saveAndFlush(template);

        JsonNode schema = objectMapper.readTree("""
            {
              "sectorCode": "S1",
              "tables": [
                {
                  "tableKey": "t1",
                  "sheetName": "First",
                  "order": 1,
                  "fields": [
                    { "fieldKey": "f1", "headerName": "Name", "type": "TEXT", "required": true },
                    { "fieldKey": "f2", "headerName": "Status", "type": "TEXT", "validations": { "enum": ["A","B"] } }
                  ]
                },
                {
                  "tableKey": "t2",
                  "sheetName": "Second",
                  "order": 2,
                  "fields": [
                    { "fieldKey": "g1", "headerName": "Value", "type": "NUMBER" }
                  ]
                }
              ]
            }
            """);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setTemplate(template);
        version.setVersionNumber(1);
        version.setStatus("DRAFT");
        version.setSchemaJson(schema);
        version.setSchemaHash("abc");
        version.setCreatedBy("u");
        version = versionRepository.saveAndFlush(version);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        templateService.writeExportWorkbook(version.getId(), out);
        byte[] bytes = out.toByteArray();
        assertThat(bytes.length).isGreaterThan(0);

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Set<String> sheetNames = new HashSet<>();
            for (int i = 0; i < wb.getNumberOfSheets(); i++) {
                sheetNames.add(wb.getSheetAt(i).getSheetName());
            }
            assertThat(sheetNames).contains("First", "Second", "__metadata__");

            int metaIndex = wb.getSheetIndex("__metadata__");
            assertThat(metaIndex).isGreaterThanOrEqualTo(0);
            assertThat(wb.getSheetVisibility(metaIndex)).isEqualTo(SheetVisibility.VERY_HIDDEN);

            org.apache.poi.ss.usermodel.Sheet firstSheet = wb.getSheet("First");
            org.apache.poi.ss.usermodel.Row headerRow = firstSheet.getRow(0);
            assertThat(headerRow).isNotNull();
            String firstHeader = headerRow.getCell(0).getStringCellValue();
            assertThat(firstHeader).endsWith(" *");
        }
    }
}
