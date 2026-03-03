package com.eca.template.infrastructure.hashing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Same schema content must produce the same hash across runs (deterministic canonicalization + SHA-256).
 */
class SchemaHasherDeterminismTest {

    private SchemaHasher hasher;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        ObjectMapper om = new ObjectMapper();
        JsonCanonicalizer canonicalizer = new JsonCanonicalizerImpl(om);
        hasher = new SchemaHasherImpl(canonicalizer);
        objectMapper = om;
    }

    @Test
    void sameSchemaContent_producesSameHash() throws Exception {
        String json = "{\"sectorCode\":\"S1\",\"templateName\":\"T1\",\"tables\":[{\"tableKey\":\"t1\",\"sheetName\":\"Sheet1\",\"order\":1,\"fields\":[]}]}";
        JsonNode node1 = objectMapper.readTree(json);
        JsonNode node2 = objectMapper.readTree(json);

        String hash1 = hasher.hash(node1);
        String hash2 = hasher.hash(node2);

        assertThat(hash1).isEqualTo(hash2);
        assertThat(hash1).matches("[a-f0-9]{64}");
    }

    @Test
    void differentKeyOrder_sameContent_producesSameHash() throws Exception {
        JsonNode node1 = objectMapper.readTree("{\"a\":1,\"b\":2,\"c\":3}");
        JsonNode node2 = objectMapper.readTree("{\"c\":3,\"a\":1,\"b\":2}");

        assertThat(hasher.hash(node1)).isEqualTo(hasher.hash(node2));
    }

    @Test
    void differentContent_producesDifferentHash() throws Exception {
        JsonNode node1 = objectMapper.readTree("{\"sectorCode\":\"S1\",\"tables\":[]}");
        JsonNode node2 = objectMapper.readTree("{\"sectorCode\":\"S2\",\"tables\":[]}");

        assertThat(hasher.hash(node1)).isNotEqualTo(hasher.hash(node2));
    }
}
