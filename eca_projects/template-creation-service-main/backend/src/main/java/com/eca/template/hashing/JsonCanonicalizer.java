package com.eca.template.hashing;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Produces a deterministic canonical JSON string from a JsonNode (stable key ordering).
 * Used before hashing so the same schema always yields the same hash.
 */
public interface JsonCanonicalizer {

    /**
     * Serialize the JSON to a string with alphabetically sorted keys at every level.
     */
    String toCanonicalString(JsonNode node);
}
