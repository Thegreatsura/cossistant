import { describe, expect, it } from "bun:test";

import {
    buildLocaleChain,
    createTextUtils,
    normalizeOverrides,
    resolveMessage,
    BUILTIN_LOCALES,
} from "./runtime";

describe("support text locale resolution", () => {
    it("builds a locale preference chain with fallbacks", () => {
        const chain = buildLocaleChain(["fr-CA", "es", null, "fr-ca"]);
        expect(chain).toEqual(["fr-ca", "fr", "es", "en"]);
    });

    it("prefers locale-specific overrides over defaults", () => {
        const overrides = normalizeOverrides({
            "common.brand.watermark": {
                fr: "Propulsé par",
                en: "Powered",
            },
        });

        const message = resolveMessage("common.brand.watermark", ["fr", "en"], overrides);
        expect(message).toBe("Propulsé par");
    });

    it("falls back to language subtags and any-locale overrides", () => {
        const overrides = normalizeOverrides({
            "common.brand.watermark": {
                "en-GB": "Powered (UK)",
            },
            "common.actions.askQuestion": "Reach out",
        });

        const exact = resolveMessage("common.brand.watermark", ["en-gb", "en"], overrides);
        expect(exact).toBe("Powered (UK)");

        const anyLocale = resolveMessage("common.actions.askQuestion", ["es"], overrides);
        expect(anyLocale).toBe("Reach out");
    });

    it("falls back to built-in locales when no override is present", () => {
        const overrides = normalizeOverrides({});
        const message = resolveMessage("common.brand.watermark", ["de"], overrides);
        expect(message).toBe(BUILTIN_LOCALES.en["common.brand.watermark"]);
    });

    it("provides locale-aware time of day labels", () => {
        const { timeOfDay } = createTextUtils("fr");
        const originalGetHours = Date.prototype.getHours;

        try {
            Date.prototype.getHours = function getHours() {
                return 9;
            };
            const morning = timeOfDay();

            Date.prototype.getHours = function getHours() {
                return 16;
            };
            const afternoon = timeOfDay();

            Date.prototype.getHours = function getHours() {
                return 22;
            };
            const evening = timeOfDay();

            expect(morning.token).toBe("morning");
            expect(typeof morning.label).toBe("string");
            expect(morning.label.length).toBeGreaterThan(0);

            expect(afternoon.token).toBe("afternoon");
            expect(typeof afternoon.label).toBe("string");
            expect(afternoon.label.length).toBeGreaterThan(0);

            expect(evening.token).toBe("evening");
            expect(typeof evening.label).toBe("string");
            expect(evening.label.length).toBeGreaterThan(0);
        } finally {
            Date.prototype.getHours = originalGetHours;
        }
    });
});
