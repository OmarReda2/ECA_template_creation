package com.eca.template;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.eca")
@EntityScan(basePackages = "com.eca")
@EnableJpaRepositories(basePackages = "com.eca")
public class TemplateCreationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TemplateCreationServiceApplication.class, args);
    }
}

