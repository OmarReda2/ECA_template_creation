package com.eca.template.controller;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for GET /api/templates (list templates for dashboard).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ListTemplatesTest {

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
    void listTemplates_returnsEmptyArrayWhenNoTemplates() throws Exception {
        ResultActions result = mockMvc.perform(get("/api/templates"))
                .andExpect(status().isOk());

        String body = result.andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isZero();
    }

    @Test
    void listTemplates_returnsTemplateWithLatestVersionAfterCreate() throws Exception {
        String createBody = "{\"name\":\"Dashboard Template\",\"sectorCode\":\"S1\",\"createdBy\":\"user@test\"}";
        mockMvc.perform(post("/api/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated());

        ResultActions listResult = mockMvc.perform(get("/api/templates"))
                .andExpect(status().isOk());

        String body = listResult.andReturn().getResponse().getContentAsString();
        JsonNode array = objectMapper.readTree(body);
        assertThat(array.isArray()).isTrue();
        assertThat(array.size()).isEqualTo(1);

        JsonNode item = array.get(0);
        assertThat(item.has("templateId")).isTrue();
        assertThat(item.has("name")).isTrue();
        assertThat(item.get("name").asText()).isEqualTo("Dashboard Template");
        assertThat(item.has("sectorCode")).isTrue();
        assertThat(item.get("sectorCode").asText()).isEqualTo("S1");
        assertThat(item.has("status")).isTrue();
        assertThat(item.has("createdAt")).isTrue();
        assertThat(item.has("createdBy")).isTrue();
        assertThat(item.has("latestVersion")).isTrue();

        JsonNode latest = item.get("latestVersion");
        assertThat(latest.isNull()).isFalse();
        assertThat(latest.has("versionId")).isTrue();
        assertThat(latest.has("versionNumber")).isTrue();
        assertThat(latest.get("versionNumber").asInt()).isEqualTo(1);
        assertThat(latest.has("status")).isTrue();
        assertThat(latest.has("createdAt")).isTrue();
        assertThat(latest.has("createdBy")).isTrue();
        assertThat(latest.has("schemaHash")).isTrue();
    }
}
