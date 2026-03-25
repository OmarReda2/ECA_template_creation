package com.eca.template;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.eca")
public class TemplateCreationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TemplateCreationServiceApplication.class, args);
    }
}

