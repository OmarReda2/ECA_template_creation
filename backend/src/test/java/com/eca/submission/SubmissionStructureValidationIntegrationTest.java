package com.eca.submission;

import com.eca.submission.controller.SubmissionController;
import com.eca.submission.service.SubmissionService;
import com.eca.submission.service.SubmissionStructureValidationService;
import com.eca.submission.parser.SubmissionWorkbookParser;
import com.eca.template.TemplateCreationServiceApplication;
import com.eca.template.entity.TemplateEntity;
import com.eca.template.entity.TemplateVersionEntity;
import com.eca.template.repository.TemplateJpaRepository;
import com.eca.template.repository.TemplateVersionJpaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.poi.ss.usermodel.Row;
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
import java.util.List;
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
class SubmissionStructureValidationIntegrationTest {

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
    private SubmissionStructureValidationService structureValidationService;

    @Autowired
    private TemplateJpaRepository templateRepository;

    @Autowired
    private TemplateVersionJpaRepository versionRepository;

    @Test
    void validateStructure_returnsCompactSuccessForMatchingWorkbook() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-1",
                List.of(
                        new SheetSpec("Employees", List.of("Employee ID *", "Employee Name")),
                        new SheetSpec("Departments", List.of("Department Code *"))
                )
        ));

        assertThat(response.targetVersion()).isNotNull();
        assertThat(response.sheetsChecked()).isEqualTo(2);
        assertThat(response.errors()).isEmpty();
        assertThat(response.warnings()).isEmpty();
        assertThat(response.sheetIssues()).isEmpty();
    }

    @Test
    void validateStructure_reportsMissingSheetsHeadersAndExtras() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-1",
                List.of(
                        new SheetSpec("Employees", List.of("Employee Name", "Legacy Header")),
                        new SheetSpec("Notes", List.of("Comment"))
                )
        ));

        assertThat(response.sheetsChecked()).isEqualTo(2);
        assertThat(response.errors().stream().map(issue -> issue.code()).toList()).contains("MISSING_SHEET", "MISSING_HEADER");
        assertThat(response.warnings().stream().map(issue -> issue.code()).toList()).contains("EXTRA_SHEET", "EXTRA_HEADER");
        assertThat(response.sheetIssues())
                .anyMatch(issue -> issue.sheetName().equals("Employees") && issue.missingHeaders().contains("Employee ID *"))
                .anyMatch(issue -> issue.sheetName().equals("Departments") && issue.missingHeaders().contains("Department Code *"));
    }

    @Test
    void validateStructure_stopsWhenIdentityCannotBeResolved() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-2",
                List.of(new SheetSpec("Employees", List.of("Employee ID *", "Employee Name")))
        ));

        assertThat(response.targetVersion()).isNotNull();
        assertThat(response.sheetsChecked()).isZero();
        assertThat(response.errors().stream().map(issue -> issue.code()).toList()).contains("HASH_MISMATCH");
        assertThat(response.sheetIssues()).isEmpty();
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
        version.setSchemaJson(schemaJson());
        version.setSchemaHash(schemaHash);
        version.setCreatedBy("u");
        return versionRepository.saveAndFlush(version);
    }

    private ObjectNode schemaJson() {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode root = mapper.createObjectNode();
        ArrayNode tables = root.putArray("tables");

        ObjectNode employees = tables.addObject();
        employees.put("sheetName", "Employees");
        ArrayNode employeeFields = employees.putArray("fields");
        employeeFields.addObject().put("headerName", "Employee ID").put("required", true);
        employeeFields.addObject().put("headerName", "Employee Name").put("required", false);

        ObjectNode departments = tables.addObject();
        departments.put("sheetName", "Departments");
        ArrayNode departmentFields = departments.putArray("fields");
        departmentFields.addObject().put("headerName", "Department Code").put("required", true);

        return root;
    }

    private MockMultipartFile workbookWithSheets(
            UUID templateId,
            UUID versionId,
            int versionNumber,
            String schemaHash,
            List<SheetSpec> sheets
    ) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet meta = workbook.createSheet("__metadata__");
            setMetadataRow(meta, 0, "template_id", templateId.toString());
            setMetadataRow(meta, 1, "version_id", versionId.toString());
            setMetadataRow(meta, 2, "version_number", String.valueOf(versionNumber));
            setMetadataRow(meta, 3, "schema_hash", schemaHash);

            workbook.createSheet("Instructions");
            workbook.createSheet("_validation");

            for (SheetSpec spec : sheets) {
                Sheet sheet = workbook.createSheet(spec.name());
                Row headerRow = sheet.createRow(0);
                for (int i = 0; i < spec.headers().size(); i++) {
                    headerRow.createCell(i).setCellValue(spec.headers().get(i));
                }
            }

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
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(value);
    }

    private record SheetSpec(String name, List<String> headers) {
    }
}
