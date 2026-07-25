import en from "./locales/en.json";
import type { TranslationKey } from "./keys";

export type { TranslationKey } from "./keys";

export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
  { code: "es", label: "Español", dir: "ltr" as const },
  { code: "nb", label: "Norsk", dir: "ltr" as const },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export type Translations = Record<TranslationKey, string>;

const loaders = {
  en: () => import("./locales/en.json"),
  ar: () => import("./locales/ar.json"),
  es: () => import("./locales/es.json"),
  nb: () => import("./locales/nb.json"),
} satisfies Record<LangCode, () => Promise<{ default: Translations }>>;

const isLangCode = (lang: string): lang is LangCode =>
  LANGUAGES.some((entry) => entry.code === lang);

export function getEnglishTranslations(): Translations {
  return en;
}

export async function loadTranslations(lang: LangCode | string): Promise<Translations> {
  if (!isLangCode(lang)) {
    return en;
  }
  const localeModule = await loaders[lang]();
  return localeModule.default;
}

export function translate(
  translations: Translations,
  key: TranslationKey,
  vars?: Record<string, string>,
): string {
  return interpolate(translations[key] ?? key, vars);
}

export function translateDynamic(
  translations: Translations,
  key: string,
  vars?: Record<string, string>,
): string {
  const text = (translations as Record<string, string | undefined>)[key] ?? key;
  return interpolate(text, vars);
}

/** @deprecated Use translate() — kept for incremental migration */
export function t(
  translations: Translations,
  key: TranslationKey,
  vars?: Record<string, string>,
): string {
  return translate(translations, key, vars);
}

function interpolate(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  return Object.entries(vars).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, value),
    text,
  );
}
