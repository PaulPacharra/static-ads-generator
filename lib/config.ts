/**
 * Ad formats – nur 9:16 und 1:1, jeweils 2 Varianten pro Format (4 Ads gesamt).
 */
export const AD_FORMATS = [
  { id: "9:16", label: "9:16 (Stories)", ratio: "9:16", description: "Stories, Reels" },
  { id: "1:1", label: "1:1 (Square)", ratio: "1:1", description: "Social, Feed" },
] as const;

/** Wie viele Ads pro Format erzeugt werden. */
export const COPIES_PER_FORMAT = 2;

export type AspectRatio = (typeof AD_FORMATS)[number]["ratio"];

/** Medium = für welches Netzwerk die Ads sind. Es werden immer 2× 9:16 und 2× 1:1 erstellt. */
export const MEDIA_OPTIONS = [
  {
    id: "google",
    label: "Google Ads",
    description: "2× 9:16, 2× 1:1",
    formatRatios: ["9:16", "1:1"] as const,
  },
  {
    id: "meta",
    label: "Meta (Facebook & Instagram)",
    description: "2× 9:16, 2× 1:1",
    formatRatios: ["9:16", "1:1"] as const,
  },
  {
    id: "all",
    label: "Alle Formate",
    description: "2× 9:16, 2× 1:1",
    formatRatios: ["9:16", "1:1"] as const,
  },
] as const;

export type MediaId = (typeof MEDIA_OPTIONS)[number]["id"];

/** Liefert die zu generierenden Formate – jedes Format COPIES_PER_FORMAT mal (z.B. 2× 9:16, 2× 1:1). */
export function getFormatsForMedium(mediumId: MediaId) {
  const option = MEDIA_OPTIONS.find((m) => m.id === mediumId);
  const formats = option
    ? AD_FORMATS.filter((f) =>
        (option.formatRatios as readonly string[]).includes(f.ratio)
      )
    : [...AD_FORMATS];
  const result: typeof AD_FORMATS[number][] = [];
  for (let i = 0; i < COPIES_PER_FORMAT; i++) {
    result.push(...formats);
  }
  return result;
}

/**
 * Heimtest products – extend this list for your tests.
 */
export const HEIMTESTS = [
  { id: "vitamin-d", name: "Vitamin D", slug: "Vitamin D Test" },
  { id: "schilddruese", name: "Schilddrüse", slug: "Schilddrüsen-Test" },
  { id: "nahrungsmittel", name: "Nahrungsmittelunverträglichkeit", slug: "Nahrungsmittelunverträglichkeit Test" },
  { id: "allergie", name: "Allergie", slug: "Allergie Test" },
  { id: "cholesterin", name: "Cholesterin", slug: "Cholesterin Test" },
  { id: "sonstige", name: "Sonstiger Heimtest", slug: "Heimtest" },
] as const;

export type HeimtestId = (typeof HEIMTESTS)[number]["id"];
