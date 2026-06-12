package com.eca.submission;

import com.eca.submission.controller.SubmissionController;
import com.eca.submission.model.SubmissionValidationTargetSource;
import com.eca.submission.repository.SubmissionJpaRepository;
import com.eca.submission.service.SubmissionPersistenceService;
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
import org.apache.poi.ss.usermodel.CellType;
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
        SubmissionPersistenceService.class,
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

    @Autowired
    private SubmissionJpaRepository submissionRepository;

    @Test
    void validateStructure_returnsCompactSuccessForMatchingWorkbook() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-1",
                List.of(
                        new SheetSpec(
                                "Employees",
                                List.of("Employee ID *", "Employee Name", "Active", "Salary", "Category", "Start Date"),
                                List.of(
                                        List.of(new CellSpec("E001"), new CellSpec("Alice"), new CellSpec("Yes"), new CellSpec(1000.50), new CellSpec("A"), new CellSpec("2026-03-01"))
                                )
                        ),
                        new SheetSpec(
                                "Departments",
                                List.of("Department Code *"),
                                List.of(List.of(new CellSpec("D01")))
                        )
                )
        ));

        assertThat(response.targetVersion()).isNotNull();
        assertThat(response.validationTargetSource()).isEqualTo(SubmissionValidationTargetSource.AUTO_IDENTIFIED);
        assertThat(response.manualFallbackUsed()).isFalse();
        assertThat(response.sheetsChecked()).isEqualTo(2);
        assertThat(response.rowsChecked()).isEqualTo(2);
        assertThat(response.errors()).isEmpty();
        assertThat(response.warnings()).isEmpty();
        assertThat(response.sheetIssues()).isEmpty();
        assertThat(response.submissionId()).isNotNull();
        assertThat(submissionRepository.findById(response.submissionId())).isPresent();
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
                        new SheetSpec("Employees", List.of("Employee Name", "Legacy Header"), List.of()),
                        new SheetSpec("Notes", List.of("Comment"), List.of())
                )
        ));

        assertThat(response.sheetsChecked()).isEqualTo(2);
        assertThat(response.rowsChecked()).isZero();
        assertThat(response.validationTargetSource()).isEqualTo(SubmissionValidationTargetSource.AUTO_IDENTIFIED);
        assertThat(response.manualFallbackUsed()).isFalse();
        assertThat(response.submissionId()).isNull();
        assertThat(response.errors().stream().map(issue -> issue.code()).toList()).contains("MISSING_SHEET", "MISSING_HEADER");
        assertThat(response.warnings().stream().map(issue -> issue.code()).toList()).contains("EXTRA_SHEET", "EXTRA_HEADER");
        assertThat(response.sheetIssues())
                .anyMatch(issue -> issue.sheetName().equals("Employees") && issue.missingHeaders().contains("Employee ID *"))
                .anyMatch(issue -> issue.sheetName().equals("Departments") && issue.missingHeaders().contains("Department Code *"));
    }

    @Test
    void validateStructure_reportsRowAndCellValidationIssues() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-1",
                List.of(
                        new SheetSpec(
                                "Employees",
                                List.of("Employee ID *", "Employee Name", "Active", "Salary", "Category", "Start Date"),
                                List.of(
                                        List.of(new CellSpec(""), new CellSpec("Alice"), new CellSpec("maybe"), new CellSpec("abc"), new CellSpec("Z"), new CellSpec("not-a-date")),
                                        List.of(new CellSpec("E002"), new CellSpec("Bob"), new CellSpec("No"), new CellSpec(50), new CellSpec("A"), new CellSpec("2026-03-02"))
                                )
                        ),
                        new SheetSpec(
                                "Departments",
                                List.of("Department Code *"),
                                List.of(List.of(new CellSpec("")))
                        )
                )
        ));

        assertThat(response.sheetsChecked()).isEqualTo(2);
        assertThat(response.rowsChecked()).isEqualTo(3);
        assertThat(response.validationTargetSource()).isEqualTo(SubmissionValidationTargetSource.AUTO_IDENTIFIED);
        assertThat(response.manualFallbackUsed()).isFalse();
        assertThat(response.submissionId()).isNull();
        assertThat(response.errors().stream().map(issue -> issue.code()).toList()).contains(
                "REQUIRED_VALUE_MISSING",
                "INVALID_TYPE",
                "INVALID_ENUM_VALUE",
                "VALUE_BELOW_MIN"
        );
        assertThat(response.errors())
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Employee ID *".equals(issue.headerName()))
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Active".equals(issue.headerName()))
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Salary".equals(issue.headerName()))
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Category".equals(issue.headerName()))
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Start Date".equals(issue.headerName()))
                .anyMatch(issue -> issue.rowNumber() != null && issue.rowNumber() == 2 && "Department Code *".equals(issue.headerName()));
    }

    @Test
    void validateStructure_stopsWhenIdentityCannotBeResolved() throws Exception {
        TemplateVersionEntity version = saveVersion("hash-1");

        var response = structureValidationService.validateStructure(workbookWithSheets(
                version.getTemplate().getId(),
                version.getId(),
                version.getVersionNumber(),
                "hash-2",
                List.of(new SheetSpec("Employees", List.of("Employee ID *"), List.of()))
        ));

        assertThat(response.targetVersion()).isNotNull();
        assertThat(response.sheetsChecked()).isZero();
        assertThat(response.rowsChecked()).isZero();
        assertThat(response.validationTargetSource()).isEqualTo(SubmissionValidationTargetSource.AUTO_IDENTIFIED);
        assertThat(response.manualFallbackUsed()).isFalse();
        assertThat(response.submissionId()).isNull();
        assertThat(response.errors().stream().map(issue -> issue.code()).toList()).contains("HASH_MISMATCH");
        assertThat(response.sheetIssues()).isEmpty();
    }

    @Test
    void validateStructure_allowsManualFallbackAgainstLatestTemplateVersion() throws Exception {
        TemplateVersionEntity oldVersion = saveVersion("hash-old");
        TemplateVersionEntity latestVersion = saveVersion(oldVersion.getTemplate(), 2, "hash-new");

        var response = structureValidationService.validateStructure(
                workbookWithMissingMetadata(List.of(
                        new SheetSpec(
                                "Employees",
                                List.of("Employee ID *", "Employee Name", "Active", "Salary", "Category", "Start Date"),
                                List.of(List.of(new CellSpec("E001"), new CellSpec("Alice"), new CellSpec("Yes"), new CellSpec(1000.50), new CellSpec("A"), new CellSpec("2026-03-01")))
                        ),
                        new SheetSpec(
                                "Departments",
                                List.of("Department Code *"),
                                List.of(List.of(new CellSpec("D01")))
                        )
                )),
                latestVersion.getTemplate().getId()
        );

        assertThat(response.validationTargetSource()).isEqualTo(SubmissionValidationTargetSource.MANUAL_FALLBACK);
        assertThat(response.manualFallbackUsed()).isTrue();
        assertThat(response.targetVersion()).isNotNull();
        assertThat(response.targetVersion().versionId()).isEqualTo(latestVersion.getId());
        assertThat(response.submissionId()).isNotNull();
        assertThat(response.errors()).isEmpty();
        assertThat(response.warnings()).isNotEmpty();
        assertThat(response.warnings().stream().map(issue -> issue.message()).toList())
                .anyMatch(message -> message.contains("Manual fallback validation"));
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

    private TemplateVersionEntity saveVersion(TemplateEntity template, int versionNumber, String schemaHash) {
        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setTemplate(template);
        version.setVersionNumber(versionNumber);
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
        employeeFields.addObject().put("headerName", "Employee ID").put("required", true).put("type", "TEXT");
        employeeFields.addObject().put("headerName", "Employee Name").put("required", false).put("type", "TEXT");
        employeeFields.addObject().put("headerName", "Active").put("required", false).put("type", "BOOLEAN");
        ObjectNode salary = employeeFields.addObject();
        salary.put("headerName", "Salary");
        salary.put("required", false);
        salary.put("type", "CURRENCY");
        salary.putObject("validations").put("min", 100).put("max", 5000);
        ObjectNode category = employeeFields.addObject();
        category.put("headerName", "Category");
        category.put("required", false);
        category.put("type", "TEXT");
        category.putObject("validations").putArray("enumValues").add("A").add("B");
        employeeFields.addObject().put("headerName", "Start Date").put("required", false).put("type", "DATE");

        ObjectNode departments = tables.addObject();
        departments.put("sheetName", "Departments");
        ArrayNode departmentFields = departments.putArray("fields");
        departmentFields.addObject().put("headerName", "Department Code").put("required", true).put("type", "TEXT");

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
                for (int rowIndex = 0; rowIndex < spec.rows().size(); rowIndex++) {
                    Row row = sheet.createRow(rowIndex + 1);
                    List<CellSpec> rowValues = spec.rows().get(rowIndex);
                    for (int columnIndex = 0; columnIndex < rowValues.size(); columnIndex++) {
                        writeCell(row, columnIndex, rowValues.get(columnIndex));
                    }
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

    private MockMultipartFile workbookWithMissingMetadata(List<SheetSpec> sheets) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Instructions");
            workbook.createSheet("_validation");

            for (SheetSpec spec : sheets) {
                Sheet sheet = workbook.createSheet(spec.name());
                Row headerRow = sheet.createRow(0);
                for (int i = 0; i < spec.headers().size(); i++) {
                    headerRow.createCell(i).setCellValue(spec.headers().get(i));
                }
                for (int rowIndex = 0; rowIndex < spec.rows().size(); rowIndex++) {
                    Row row = sheet.createRow(rowIndex + 1);
                    List<CellSpec> rowValues = spec.rows().get(rowIndex);
                    for (int columnIndex = 0; columnIndex < rowValues.size(); columnIndex++) {
                        writeCell(row, columnIndex, rowValues.get(columnIndex));
                    }
                }
            }

            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "submission-missing-metadata.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }

    private void writeCell(Row row, int columnIndex, CellSpec cellSpec) {
        var cell = row.createCell(columnIndex);
        if (cellSpec.value() == null) {
            cell.setBlank();
            return;
        }
        if (cellSpec.type() == CellType.NUMERIC && cellSpec.value() instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            return;
        }
        if (cellSpec.type() == CellType.BOOLEAN && cellSpec.value() instanceof Boolean bool) {
            cell.setCellValue(bool);
            return;
        }
        cell.setCellValue(String.valueOf(cellSpec.value()));
    }

    private void setMetadataRow(Sheet sheet, int rowIndex, String key, String value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(value);
    }

    private record SheetSpec(String name, List<String> headers, List<List<CellSpec>> rows) {
    }

    private record CellSpec(Object value, CellType type) {
        private CellSpec(String value) {
            this(value, CellType.STRING);
        }

        private CellSpec(double value) {
            this(value, CellType.NUMERIC);
        }
    }
}
