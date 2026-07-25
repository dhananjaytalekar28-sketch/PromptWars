import { describe, expect, it } from "vitest";
import { getEnglishTranslations, translate } from "@/shared/i18n";

describe("translations", () => {
  it("interpolates variables", () => {
    expect(translate(getEnglishTranslations(), "person.greeting", { name: "Sam" })).toContain(
      "Sam",
    );
  });

  it("falls back to the key for an unknown translation", () => {
    expect(translate(getEnglishTranslations(), "missing.key" as "app.name")).toBe("missing.key");
  });
});
