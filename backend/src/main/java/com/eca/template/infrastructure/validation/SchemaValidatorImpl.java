package com.eca.template.infrastructure.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.eca.template.domain.exception.SchemaValidationException;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Validates schema structure and business rules using JsonNode. Throws SchemaValidationException with structured errors.
 */
@Component
public class SchemaValidatorImpl implements SchemaValidator {

    private static final Set<String> ALLOWED_TYPES = Set.of("TEXT", "NUMBER", "DATE", "BOOLEAN", "CURRENCY");
    private static final Set<String> TYPES_ALLOWING_ENUM = Set.of("TEXT");
    private static final Set<String> TYPES_ALLOWING_MIN_MAX = Set.of("NUMBER", "CURRENCY");
    private static final int MAX_SHEET_NAME_LENGTH = 31;
    private static final Pattern INVALID_SHEET_NAME_CHARS = Pattern.compile("[\\\\/?*\\[\\]]");

    /**
     * Validates the provided schema content.
     *
     * <p>Ensures the input is a valid {@link JsonNode} representing a JSON object,
     * then performs structural and business-rule validation on the schema.
     * All detected validation issues are accumulated and reported together
     * through {@link SchemaValidationException}.
     *
     * <p>Validation flow:
     * <ul>
     *   <li>Verify schema is a JSON object</li>
     *   <li>Validate root-level attributes (templateName, sectorCode)</li>
     *   <li>Validate tables and their fields</li>
     * </ul>
     *
     * @param schemaContent schema content expected to be a JsonNode
     * @throws SchemaValidationException if validation fails with one or more errors
     */
    @Override
    public void validate(Object schemaContent) {
        if (!(schemaContent instanceof JsonNode root)) {
            throw new SchemaValidationException("Schema must be a valid JSON object", List.of());
        }
        if (!root.isObject()) {
            throw new SchemaValidationException("Schema must be a JSON object", List.of());
        }
        List<SchemaValidationException.SchemaValidationError> errors = new ArrayList<>();

        validateRoot(root, errors);
        validateTables(root.get("tables"), errors);

        if (!errors.isEmpty()) {
            throw new SchemaValidationException("Schema validation failed", errors);
        }
    }

    /**
     * Validates root-level schema attributes.
     *
     * <p>Checks high-level metadata fields required for the template:
     * <ul>
     *   <li>{@code templateName} – optional but must not be blank if present</li>
     *   <li>{@code sectorCode} – required, must be a non-empty string</li>
     * </ul>
     *
     * <p>Any validation failures are appended to the provided error list.
     *
     * @param root   root JSON schema node
     * @param errors collection where validation errors are accumulated
     */
    private void validateRoot(JsonNode root, List<SchemaValidationException.SchemaValidationError> errors) {
        JsonNode templateName = root.get("templateName");
        if (templateName != null && templateName.isTextual() && templateName.asText().isBlank()) {
            errors.add(new SchemaValidationException.SchemaValidationError("templateName", "templateName must be non-empty"));
        }
        JsonNode sectorCode = root.get("sectorCode");
        if (sectorCode == null || !sectorCode.isTextual() || sectorCode.asText().isBlank()) {
            errors.add(new SchemaValidationException.SchemaValidationError("sectorCode", "sectorCode is required and must be non-empty"));
        }
    }

    /**
     * Validates the list of table definitions within the schema.
     *
     * <p>For each table the following checks are performed:
     * <ul>
     *   <li>{@code tableKey} uniqueness (when present)</li>
     *   <li>{@code sheetName} existence, format, Excel constraints and uniqueness</li>
     *   <li>{@code order} must represent an integer if provided</li>
     *   <li>Delegates validation of table fields</li>
     * </ul>
     *
     * <p>Excel-specific constraints enforced:
     * <ul>
     *   <li>Sheet name length ≤ 31 characters</li>
     *   <li>No invalid characters: \ / ? * [ ]</li>
     * </ul>
     *
     * @param tablesNode JSON node representing the array of tables
     * @param errors     collection where validation errors are accumulated
     */
    private void validateTables(JsonNode tablesNode, List<SchemaValidationException.SchemaValidationError> errors) {
        if (tablesNode == null || !tablesNode.isArray()) return;

        Set<String> tableKeys = new HashSet<>();
        Set<String> sheetNames = new HashSet<>();

        for (int i = 0; i < tablesNode.size(); i++) {
            JsonNode t = tablesNode.get(i);
            String prefix = "tables[" + (i+1) + "]";
            if (!t.isObject()) continue;

            JsonNode tableKeyNode = t.get("tableKey");
            if (tableKeyNode != null && tableKeyNode.isTextual()) {
                String tableKey = tableKeyNode.asText();
                if (!tableKey.isBlank() && !tableKeys.add(tableKey)) {
                    errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".tableKey", "duplicate tableKey: " + tableKey));
                }
            }

            JsonNode sheetNameNode = t.get("sheetName");
            if (sheetNameNode == null || !sheetNameNode.isTextual()) {
                errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".sheetName", "sheetName is required"));
            } else {
                String trimmed = sheetNameNode.asText().trim();
                if (trimmed.isEmpty()) {
                    errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".sheetName", "sheetName must not be blank"));
                } else {
                    if (trimmed.length() > MAX_SHEET_NAME_LENGTH) {
                        errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".sheetName", "sheetName length must be <= 31"));
                    }
                    if (INVALID_SHEET_NAME_CHARS.matcher(trimmed).find()) {
                        errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".sheetName", "sheetName must not contain \\ / ? * [ ]"));
                    }
                    if (!sheetNames.add(trimmed)) {
                        errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".sheetName", "duplicate sheetName (after trimming): " + trimmed));
                    }
                }
            }

            JsonNode orderNode = t.get("order");
            if (orderNode != null && orderNode.isNumber() && orderNode.isDouble() && orderNode.asDouble() != orderNode.asInt()) {
                errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".order", "order must be an integer"));
            }

            validateFields(t.get("fields"), prefix + ".fields", errors);
        }
    }


    /**
     * Validates field definitions inside a table.
     *
     * <p>For each field the following validations are performed:
     * <ul>
     *   <li>{@code fieldKey} uniqueness within the table</li>
     *   <li>{@code headerName} must exist and be non-empty</li>
     *   <li>{@code type} must be one of the allowed field types</li>
     *   <li>Delegates validation of type-specific validation rules</li>
     * </ul>
     *
     * @param fieldsNode  JSON node representing the array of fields
     * @param pathPrefix  path prefix used to build precise error locations
     * @param errors      collection where validation errors are accumulated
     */
    private void validateFields(JsonNode fieldsNode, String pathPrefix, List<SchemaValidationException.SchemaValidationError> errors) {
        if (fieldsNode == null || !fieldsNode.isArray()) return;
        Set<String> fieldKeys = new HashSet<>();

        for (int i = 0; i < fieldsNode.size(); i++) {
            JsonNode f = fieldsNode.get(i);
            String prefix = pathPrefix + "[" + (i+1) + "]";
            if (!f.isObject()) continue;

            JsonNode fieldKeyNode = f.get("fieldKey");
            if (fieldKeyNode != null && fieldKeyNode.isTextual()) {
                String fieldKey = fieldKeyNode.asText();
                if (!fieldKey.isBlank() && !fieldKeys.add(fieldKey)) {
                    errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".fieldKey", "duplicate fieldKey: " + fieldKey));
                }
            }

            JsonNode headerNameNode = f.get("headerName");
            if (headerNameNode == null || !headerNameNode.isTextual() || headerNameNode.asText().isBlank()) {
                errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".headerName", "headerName is required and must be non-empty"));
            }

            JsonNode typeNode = f.get("type");
            if (typeNode == null || !typeNode.isTextual()) {
                errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".type", "type is required"));
            } else {
                String type = typeNode.asText().toUpperCase();
                if (!ALLOWED_TYPES.contains(type)) {
                    errors.add(new SchemaValidationException.SchemaValidationError(prefix + ".type", "type must be one of: TEXT, NUMBER, DATE, BOOLEAN, CURRENCY"));
                } else {
                    validateFieldValidations(f.get("validations"), type, prefix, errors);
                }
            }
        }
    }


    /**
     * Validates field-level validation rules based on the field type.
     *
     * <p>Supported rules:
     * <ul>
     *   <li>{@code enum} – allowed only for TEXT fields</li>
     *   <li>{@code min}/{@code max} – allowed only for NUMBER or CURRENCY fields</li>
     *   <li>{@code min <= max} constraint when both are provided</li>
     * </ul>
     *
     * <p>If a rule is used with an incompatible field type, a validation error is recorded.
     *
     * @param v            JSON node containing validation rules
     * @param type         normalized field type
     * @param fieldPrefix  path used for reporting validation errors
     * @param errors       collection where validation errors are accumulated
     */
    private void validateFieldValidations(JsonNode v, String type, String fieldPrefix, List<SchemaValidationException.SchemaValidationError> errors) {
        if (v == null || !v.isObject()) return;
        JsonNode enumNode = v.get("enum");
        if (enumNode != null && enumNode.isArray() && enumNode.size() > 0) {
            if (!TYPES_ALLOWING_ENUM.contains(type)) {
                errors.add(new SchemaValidationException.SchemaValidationError(fieldPrefix + ".validations.enum", "enum is only allowed for type TEXT"));
            }
        }
        JsonNode enumValuesNode = v.get("enumValues");
        if (enumValuesNode != null && enumValuesNode.isArray() && enumValuesNode.size() > 0) {
            if (!TYPES_ALLOWING_ENUM.contains(type)) {
                errors.add(new SchemaValidationException.SchemaValidationError(fieldPrefix + ".validations.enumValues", "enumValues is only allowed for type TEXT"));
            }
        }
        JsonNode minNode = v.get("min");
        JsonNode maxNode = v.get("max");
        if ((minNode != null && minNode.isNumber()) || (maxNode != null && maxNode.isNumber())) {
            if (!TYPES_ALLOWING_MIN_MAX.contains(type)) {
                errors.add(new SchemaValidationException.SchemaValidationError(fieldPrefix + ".validations", "min/max are only allowed for NUMBER or CURRENCY"));
            } else if (minNode != null && minNode.isNumber() && maxNode != null && maxNode.isNumber()) {
                double min = minNode.asDouble();
                double max = maxNode.asDouble();
                if (min > max) {
                    errors.add(new SchemaValidationException.SchemaValidationError(fieldPrefix + ".validations", "min must be <= max"));
                }
            }
        }
    }
}
