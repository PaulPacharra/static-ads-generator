/**
 * Ad formats for Google & Meta (KIE Flux Kontext supports these aspect ratios).
 */
export const AD_FORMATS = [
  { id: "1:1", label: "1:1 (Square)", ratio: "1:1", description: "Social, Feed" },
  { id: "16:9", label: "16:9 (Landscape)", ratio: "16:9", description: "Display, YouTube" },
  { id: "4:3", label: "4:3", ratio: "4:3", description: "Classic" },
  { id: "3:4", label: "3:4 (Portrait)", ratio: "3:4", description: "Feed Portrait" },
  { id: "9:16", label: "9:16 (Stories)", ratio: "9:16", description: "Stories, Reels" },
  { id: "21:9", label: "21:9 (Ultra-wide)", ratio: "21:9", description: "Cinematic" },
] as const;

export type AspectRatio = (typeof AD_FORMATS)[number]["ratio"];

/** Medium = für welches Netzwerk die Ads sind → bestimmt die Formate. */
export const MEDIA_OPTIONS = [
  {
    id: "google",
    label: "Google Ads",
    description: "Responsive, Display, YouTube – 1:1, 16:9, 4:3, 9:16",
    formatRatios: ["1:1", "16:9", "4:3", "9:16"] as const,
  },
  {
    id: "meta",
    label: "Meta (Facebook & Instagram)",
    description: "Feed & Stories – 1:1, 3:4, 9:16",
    formatRatios: ["1:1", "3:4", "9:16"] as const,
  },
  {
    id: "all",
    label: "Alle Formate",
    description: "Google + Meta + Ultra-wide – alle 6 Formate",
    formatRatios: ["1:1", "16:9", "4:3", "3:4", "9:16", "21:9"] as const,
  },
] as const;

export type MediaId = (typeof MEDIA_OPTIONS)[number]["id"];

/** Liefert die zu generierenden Formate für das gewählte Medium. */
export function getFormatsForMedium(mediumId: MediaId) {
  const option = MEDIA_OPTIONS.find((m) => m.id === mediumId);
  if (!option) return [...AD_FORMATS];
  return AD_FORMATS.filter((f) =>
    (option.formatRatios as readonly string[]).includes(f.ratio)
  );
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
