package com.yourcompany.template.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI templateServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Template Creation Service API")
                        .description("Template schema management and Excel export. No data submission/OCR/approval.")
                        .version("0.0.1"));
    }
}
