import { describe, expect, it } from "vitest";
import en from "@/shared/i18n/locales/en.json";
import ar from "@/shared/i18n/locales/ar.json";
import es from "@/shared/i18n/locales/es.json";
import nb from "@/shared/i18n/locales/nb.json";
import {
  LANGUAGES,
  loadTranslations,
  translate,
  translateDynamic,
  type LangCode,
  type TranslationKey,
} from "@/shared/i18n";

const LOCALES = { en, ar, es, nb } as const;
const EN_KEYS = Object.keys(en).sort();

function placeholders(value: string): string[] {
  const matches = value.match(/\{[a-zA-Z]+\}/g);
  return matches ? [...matches].sort() : [];
}

describe("locale parity", () => {
  it("exports four languages with dir metadata", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "ar", "es", "nb"]);
    expect(LANGUAGES.find((l) => l.code === "ar")?.dir).toBe("rtl");
    expect(LANGUAGES.filter((l) => l.code !== "ar").every((l) => l.dir === "ltr")).toBe(true);
  });

  for (const [code, locale] of Object.entries(LOCALES)) {
    it(`${code} has exactly the English key set`, () => {
      expect(Object.keys(locale).sort()).toEqual(EN_KEYS);
    });
  }

  for (const [code, locale] of Object.entries(LOCALES)) {
    if (code === "en") continue;
    it(`${code} interpolation placeholders match English by key`, () => {
      for (const key of EN_KEYS as TranslationKey[]) {
        expect(placeholders(locale[key])).toEqual(placeholders(en[key]));
      }
    });
  }
});

describe("loadTranslations", () => {
  it("loads each supported locale", async () => {
    for (const { code } of LANGUAGES) {
      const loaded = await loadTranslations(code);
      expect(Object.keys(loaded).sort()).toEqual(EN_KEYS);
    }
  });

  it("falls back to English for unknown language codes", async () => {
    const loaded = await loadTranslations("zz" as LangCode);
    expect(loaded).toEqual(en);
  });
});

describe("translate", () => {
  it("interpolates variables for static keys", () => {
    expect(translate(en, "person.greeting", { name: "Sam" })).toContain("Sam");
  });

  it("falls back to the key for an unknown translation entry", () => {
    expect(translate(en, "missing.key" as TranslationKey)).toBe("missing.key");
  });

  it("resolves dynamic chip keys safely", () => {
    expect(translateDynamic(en, "chip.craving")).toBe("craving");
    expect(translateDynamic(en, "chip.unknown")).toBe("chip.unknown");
  });
});
