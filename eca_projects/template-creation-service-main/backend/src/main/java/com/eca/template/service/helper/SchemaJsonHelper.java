package com.eca.template.service.helper;


import com.eca.template.repository.TemplateVersionJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class SchemaJsonHelper {
    private final ObjectMapper objectMapper;

    public SchemaJsonHelper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;

    }


    /**
     * Initial schema_json for a new template/version: templateName, sectorCode, tables[], exportProfile{}.
     * Ensures PUT /schema validation does not fail due to null sectorCode.
     */
    public JsonNode buildInitialSchemaJson(String templateName, String sectorCode) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("templateName", templateName != null ? templateName : "");
        root.put("sectorCode", sectorCode != null ? sectorCode : "");
        root.putArray("tables");
        root.putObject("exportProfile");
        return root;
    }

    /** Deep-clone schema JsonNode so the new version has its own copy. */
    public JsonNode cloneSchemaJson(JsonNode node) {
        try {
            return objectMapper.readTree(objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to clone schema JSON", e);
        }
    }


}
