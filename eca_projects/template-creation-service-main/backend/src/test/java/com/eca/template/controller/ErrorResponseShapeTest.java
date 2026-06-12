package com.eca.template.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Asserts that controller errors return the standardized ErrorResponse shape:
 * timestamp, status, error, message, path, traceId (if available).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ErrorResponseShapeTest {

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
    void notFound_returnsStandardizedErrorResponseShape() throws Exception {
        ResultActions result = mockMvc.perform(get("/api/templates/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());

        String body = result.andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);

        assertThat(json.has("timestamp")).isTrue();
        assertThat(json.has("status")).isTrue();
        assertThat(json.get("status").asInt()).isEqualTo(404);
        assertThat(json.has("error")).isTrue();
        assertThat(json.get("error").asText()).isEqualTo("NOT_FOUND");
        assertThat(json.has("message")).isTrue();
        assertThat(json.has("path")).isTrue();
        assertThat(json.has("traceId")).isTrue();
    }
}
