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


        /**
         * Converts a JSON tree into a deterministic canonical JSON string.
         *
         * <p>The canonical representation guarantees that logically equivalent JSON
         * structures produce the same string output regardless of:
         * <ul>
         *   <li>Object key ordering</li>
         *   <li>Formatting differences (whitespace, indentation)</li>
         * </ul>
         *
         * <p>This canonical form is used as the stable input for schema hashing
         * (e.g., SHA-256) so that semantically identical schemas produce the same hash.
         *
         * @param node JSON tree representing the schema
         * @return canonical JSON string representation of the schema
         */
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

        /**
         * Recursively writes a JSON node into the {@link JsonGenerator} using a
         * deterministic structure suitable for canonical hashing.
         *
         * <p>Behavior by node type:
         * <ul>
         *   <li>OBJECT: fields are written in alphabetical order</li>
         *   <li>ARRAY: elements are written sequentially (or sorted if business rules apply)</li>
         *   <li>Primitive values: written directly (string, number, boolean, null)</li>
         * </ul>
         *
         * <p>This recursive traversal ensures the entire JSON tree is serialized
         * in a stable and predictable format.
         *
         * @param gen  JSON generator used to write canonical JSON
         * @param node current JSON node being processed
         * @throws IOException if writing to the generator fails
         */
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
