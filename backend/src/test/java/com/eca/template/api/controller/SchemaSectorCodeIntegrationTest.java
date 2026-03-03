package com.eca.template.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test: newly created versions have schema_json.sectorCode set so PUT /schema validation succeeds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SchemaSectorCodeIntegrationTest {

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
    }

    @Autowired
    MockMvc mockMvc;

    @Test
    void newVersionHasSectorCodeAndPutSchemaSucceeds() throws Exception {
        // Create template with sectorCode "scode"
        String createBody = "{\"name\":\"Scode Template\",\"sectorCode\":\"scode\",\"createdBy\":\"user@test\"}";
        String createResponse = mockMvc.perform(post("/api/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createJson = objectMapper.readTree(createResponse);
        String versionId = createJson.get("versionId").asText();

        // GET /api/versions/{versionId} returns schema_json.sectorCode == "scode"
        ResultActions getResult = mockMvc.perform(get("/api/versions/" + versionId))
                .andExpect(status().isOk());
        String versionBody = getResult.andReturn().getResponse().getContentAsString();
        JsonNode versionJson = objectMapper.readTree(versionBody);
        JsonNode schemaJson = versionJson.get("schemaJson");
        assertThat(schemaJson).isNotNull();
        assertThat(schemaJson.has("sectorCode")).isTrue();
        assertThat(schemaJson.get("sectorCode").asText()).isEqualTo("scode");

        // PUT /api/versions/{versionId}/schema succeeds when adding tables/fields (sectorCode already present)
        String putSchemaBody = "{\"templateName\":\"Scode Template\",\"sectorCode\":\"scode\",\"tables\":[{\"tableKey\":\"t1\",\"sheetName\":\"Sheet1\",\"fields\":[]}],\"exportProfile\":{}}";
        mockMvc.perform(put("/api/versions/" + versionId + "/schema")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(putSchemaBody))
                .andExpect(status().isOk());
    }
}
