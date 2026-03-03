package com.eca.template.infrastructure.hashing;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.StringWriter;
import java.util.TreeSet;

/**
 * Canonicalizes JSON with deterministic key order (alphabetical) for hashing.
 */
@Component
public class JsonCanonicalizerImpl implements JsonCanonicalizer {

    private final ObjectMapper objectMapper;

    public JsonCanonicalizerImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    @Override
    public String toCanonicalString(JsonNode node) {
        if (node == null) return "null";
        try {
            StringWriter sw = new StringWriter();
            try (JsonGenerator gen = objectMapper.getFactory().createGenerator(sw)) {
                writeNode(gen, node);
            }
            return sw.toString();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to canonicalize JSON", e);
        }
    }

    private void writeNode(JsonGenerator gen, JsonNode node) throws IOException {
        switch (node.getNodeType()) {
            case OBJECT -> {
                gen.writeStartObject();
                TreeSet<String> keys = new TreeSet<>();
                node.fieldNames().forEachRemaining(keys::add);
                for (String key : keys) {
                    gen.writeFieldName(key);
                    writeNode(gen, node.get(key));
                }
                gen.writeEndObject();
            }
            case ARRAY -> {
                gen.writeStartArray();
                for (JsonNode child : node) {
                    writeNode(gen, child);
                }
                gen.writeEndArray();
            }
            case STRING -> gen.writeString(node.asText());
            case NUMBER -> gen.writeNumber(node.decimalValue());
            case BOOLEAN -> gen.writeBoolean(node.asBoolean());
            case NULL -> gen.writeNull();
            default -> gen.writeObject(node);
        }
    }
}
