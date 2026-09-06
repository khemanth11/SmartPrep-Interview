package com.platform.cip.document;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Difficulty {
    EASY,
    MEDIUM,
    HARD;

    @JsonCreator
    public static Difficulty fromString(String value) {
        if (value == null || value.isBlank()) return MEDIUM;
        for (Difficulty d : Difficulty.values()) {
            if (d.name().equalsIgnoreCase(value.trim())) {
                return d;
            }
        }
        return MEDIUM;
    }
}
