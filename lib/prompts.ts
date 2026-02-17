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

function getPersonInstruction(include: IncludePersonOption): string {
  if (include === "none") return "";
  if (include === "person")
    return "\n6. PERSON IN SCENE: Include one person in the image (e.g. holding the test kit, at a table at home). The person should fit the product and hook: natural, diverse, professional lifestyle setting. Product remains clearly visible. No full-face close-ups unless it fits the ad; prefer natural poses that convey trust and relevance to at-home testing.";
  if (include === "couple")
    return "\n6. COUPLE IN SCENE: Include two people (a couple) in the image, e.g. together with the test kit in a home setting. Fits products aimed at couples (e.g. fertility, relationship tests). Natural, warm, professional. Both the product and the people should be clearly visible and contextually appropriate.";
  return "";
}

/**
 * Builds the prompt sent to KIE. Optional description and kitInfo improve
 * image relevance (KI can depict the right kind of kit, packaging, trust).
 * includePerson: "person" or "couple" adds instructions to show people in the ad.
 */
export function buildAdPrompt(
  productName: string,
  hook: string,
  hasReferenceImage: boolean,
  customSystemContext?: string | null,
  description?: string | null,
  kitInfo?: string | null,
  includePerson: IncludePersonOption = "none"
): string {
  const systemContext =
    customSystemContext?.trim() || DEFAULT_SYSTEM_CONTEXT;
  const personInstruction = getPersonInstruction(includePerson);
  const fullSystemContext = systemContext + personInstruction;

  const safeHook = hook.trim().slice(0, MAX_HOOK_LENGTH);
  const safeProductName = productName.trim().slice(0, 100);
  const safeDesc = description?.trim().slice(0, MAX_EXTRA_LENGTH);
  const safeKit = kitInfo?.trim().slice(0, MAX_EXTRA_LENGTH);

  let productBlock = `Product / test type: ${safeProductName}.`;
  if (safeDesc) productBlock += `\nProduct context (use for mood and trust): ${safeDesc}.`;
  if (safeKit) productBlock += `\nKit contents (can inform packaging/scene): ${safeKit}.`;

  const refInstruction = hasReferenceImage
    ? "Use the provided reference image as the exact product. Keep the product appearance identical; only adjust composition, background, or layout to create an ad image in the requested aspect ratio."
    : "Depict a generic, professional-looking at-home test kit appropriate for the product type. Do not invent specific brand logos; keep packaging neutral and credible.";

  return `${fullSystemContext}

${productBlock}
Advertising hook (use as creative direction or short on-image message): "${safeHook}."

${refInstruction}

Output: One static ad image, professional, ready for use in Google and Meta ads.`;
}
