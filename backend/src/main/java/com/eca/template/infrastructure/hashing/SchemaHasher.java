package com.eca.template.infrastructure.hashing;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Computes content hash of canonicalized schema. Used for versioning/deduplication.
 * All hashing and JSON canonicalization logic lives in infrastructure.
 */
public interface SchemaHasher {

    /**
     * Canonicalize and hash the given schema content.
     * @param schemaContent raw schema (e.g. JSON string or object)
     * @return hash string (e.g. SHA-256 hex)
     */
    String hash(JsonNode node);
}
