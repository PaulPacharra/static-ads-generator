/**
 * Strong system prompt to minimize hallucination and keep ads on-brand.
 * KIE Flux expects English prompts; we pass the final prompt in English or use enableTranslation.
 * Exportiert für Standard-Anzeige in der App und optionales Überschreiben.
 */
export const DEFAULT_SYSTEM_CONTEXT = `You are creating a single static advertisement image for a home test kit (Heimtest) used in paid ads (Google, Meta). Rules you must follow strictly:

1. REALISM: Show only what exists. If a reference image is provided, the product must look exactly like that reference: same packaging, colors, shape, branding. Do not invent or alter the product appearance.
2. NO HALLUCINATION: Do not add text, logos, or claims that are not clearly requested. Do not invent product names. Do not make diagnostic, treatment, or medical cure claims—only show a self-test product in a positive, trustworthy way.
3. COMPOSITION: One clear focal point (the test kit). Clean background suitable for ads: neutral, soft gradient, or simple lifestyle context (e.g. hand holding kit, on a table). No clutter.
4. STYLE: Professional, trustworthy, high-quality product photography style. Bright, clear, suitable for digital advertising. No cartoon or fantasy unless explicitly requested.
5. TEXT ON IMAGE: Only if the hook is short and you are sure it can be rendered legibly, integrate it subtly (e.g. as overlay). Prefer showing the product prominently without text if the hook is long—the hook will be used as ad copy separately.
6. AUDIENCE: German-speaking consumers looking for at-home health tests. Convey trust and clarity. If any text is added to the image (e.g. from the hook), use informal "du" form (address the viewer as "du"), not formal "Sie".`;

/** Max hook length to reduce moderation risk and API limits. */
const MAX_HOOK_LENGTH = 200;
const MAX_EXTRA_LENGTH = 300;

/** Steuert, ob eine Person oder ein Paar in der Anzeige gezeigt wird. */
export type IncludePersonOption = "none" | "person" | "couple";

/** Stil der Anzeige: Standard = Produktfokus; Lifestyle = Person, Platz für Headline/Features. */
export type AdStyleOption = "standard" | "lifestyle";

function getPersonInstruction(include: IncludePersonOption): string {
  if (include === "none") return "";
  if (include === "person")
    return "\n6. PERSON IN SCENE: Include one person in the image (e.g. holding the test kit, at a table at home). The person should fit the product and hook: natural, diverse, professional lifestyle setting. Product remains clearly visible. No full-face close-ups unless it fits the ad; prefer natural poses that convey trust and relevance to at-home testing.";
  if (include === "couple")
    return "\n6. COUPLE IN SCENE: Include two people (a couple) in the image, e.g. together with the test kit in a home setting. Fits products aimed at couples (e.g. fertility, relationship tests). Natural, warm, professional. Both the product and the people should be clearly visible and contextually appropriate.";
  return "";
}

/** Anweisung für Lifestyle-Anzeigen (Person, Headline-Bereich oben, Feature-Bereich unten). */
const LIFESTYLE_COMPOSITION = `

7. LIFESTYLE AD LAYOUT (match this style exactly):
- Include ONE person in an aspirational, relatable setting: e.g. on a balcony, by a window, or in a bright indoor/outdoor space. Person from chest up or waist up, natural pose (e.g. hand on railing), serene and hopeful expression. Warm, soft lighting (golden hour or bright daylight). Light clothing, professional-casual. Slight bokeh or soft background (sky, trees, city, or room).
- COMPOSITION FOR TEXT OVERLAYS: Reserve clear visual zones so the image works with overlaid text later:
  * TOP third: Bright, uncluttered area (sky, soft gradient, or very soft blur) where a bold headline would sit. Avoid busy details here.
  * MIDDLE: The person; they are the main emotional focus.
  * BOTTOM third: Either a calmer part of the scene (e.g. railing, soft shadow) or a subtle gradient so that 2–3 small feature callouts (icons + short text) could be overlaid. Do not draw text or icons; just leave compositional space.
- The test kit product can appear subtly in scene (e.g. on a railing, table, or in hand) if it fits naturally; otherwise the scene should still clearly suggest “at-home test” through mood and context. If a reference product image is provided, show it accurately in a natural position.
- Mood: Professional, trustworthy, hopeful, calm. Premium health/wellness advertising style. No cartoon, no clutter.`;

/**
 * Builds the prompt sent to KIE. Optional description and kitInfo improve
 * image relevance (KI can depict the right kind of kit, packaging, trust).
 * includePerson: "person" or "couple" adds instructions to show people in the ad.
 * adStyle: "lifestyle" adds composition for headline top + feature bottom (person in scene).
 */
export function buildAdPrompt(
  productName: string,
  hook: string,
  hasReferenceImage: boolean,
  customSystemContext?: string | null,
  description?: string | null,
  kitInfo?: string | null,
  includePerson: IncludePersonOption = "none",
  adStyle: AdStyleOption = "standard",
  referenceCount?: number
): string {
  const systemContext =
    customSystemContext?.trim() || DEFAULT_SYSTEM_CONTEXT;
  let personInstruction = getPersonInstruction(includePerson);
  if (adStyle === "lifestyle" && includePerson === "none")
    personInstruction = getPersonInstruction("person");
  const lifestyleBlock = adStyle === "lifestyle" ? LIFESTYLE_COMPOSITION : "";
  const fullSystemContext = systemContext + personInstruction + lifestyleBlock;

  const safeHook = hook.trim().slice(0, MAX_HOOK_LENGTH);
  const safeProductName = productName.trim().slice(0, 100);
  const safeDesc = description?.trim().slice(0, MAX_EXTRA_LENGTH);
  const safeKit = kitInfo?.trim().slice(0, MAX_EXTRA_LENGTH);

  let productBlock = `Product / test type: ${safeProductName}.`;
  if (safeDesc) productBlock += `\nProduct context (use for mood and trust): ${safeDesc}.`;
  if (safeKit) productBlock += `\nKit contents (can inform packaging/scene): ${safeKit}.`;

  const refInstruction = hasReferenceImage
    ? (referenceCount && referenceCount > 1
        ? "Multiple reference images provided: use the first as the exact product to depict (keep appearance identical). Use the other images as style, composition, and layout inspiration (e.g. mood, framing, headline placement). Only adjust composition, background, or layout to create an ad image in the requested aspect ratio."
        : "Use the provided reference image as the exact product. Keep the product appearance identical; only adjust composition, background, or layout to create an ad image in the requested aspect ratio.")
    : "Depict a generic, professional-looking at-home test kit appropriate for the product type. Do not invent specific brand logos; keep packaging neutral and credible.";

  return `${fullSystemContext}

${productBlock}
Advertising hook (use as creative direction or short on-image message): "${safeHook}."

${refInstruction}

Output: One static ad image, professional, ready for use in Google and Meta ads.`;
}
