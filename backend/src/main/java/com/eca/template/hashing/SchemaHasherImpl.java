package com.eca.template.hashing;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Canonicalizes schema JSON and computes SHA-256 hex hash. Deterministic: same content -> same hash.
 */
@Component
public class SchemaHasherImpl implements SchemaHasher {

    private static final String SHA_256 = "SHA-256";
    private final JsonCanonicalizer canonicalizer;

    public SchemaHasherImpl(JsonCanonicalizer canonicalizer) {
        this.canonicalizer = canonicalizer;
    }

    @Override
    public String hash(Object schemaContent) {
        if (!(schemaContent instanceof JsonNode node)) {
            throw new IllegalArgumentException("Schema content must be JsonNode");
        }
        String canonical = canonicalizer.toCanonicalString(node);
        byte[] digest = sha256(canonical.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    private static byte[] sha256(byte[] input) {
        try {
            MessageDigest md = MessageDigest.getInstance(SHA_256);
            return md.digest(input);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(SHA_256 + " not available", e);
        }
    }
}
