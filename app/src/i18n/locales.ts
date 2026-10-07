import { en } from "./en";
import { es, type Dict } from "./es";
import { pt } from "./pt";

export type { Dict };

export const DICTS = { es, en, pt } satisfies Record<string, Dict>;
export type Locale = keyof typeof DICTS;

/** BCP 47 tags for `<html lang>` and dates. */
export const TAGS: Record<Locale, string> = { es: "es-MX", en: "en-US", pt: "pt-BR" };

/**
 * The device's language, read from Accept-Language: the most preferred one we publish in, by its
 * primary subtag (es-AR → es, pt-PT → pt). English for anyone else.
 */
export function negotiate(header: string | null): Locale {
  const prefs = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.split("-")[0], q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q);
  return (prefs.find((p) => p.lang in DICTS)?.lang as Locale | undefined) ?? "en";
}
