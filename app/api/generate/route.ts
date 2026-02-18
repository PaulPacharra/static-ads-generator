import { getFormatsForMedium, type MediaId } from "@/lib/config";
import {
  createGenerateTask,
  ASPECT_RATIO_MAP,
  uploadReferenceImage,
} from "@/lib/kie";
import { buildAdPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KIE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: {
    productId?: string;
    productName?: string;
    hook: string;
    referenceImageUrl?: string;
    referenceImageUrls?: string[];
    customSystemPrompt?: string;
    medium?: MediaId;
    includePerson?: "none" | "person" | "couple";
    adStyle?: "standard" | "lifestyle";
    /** Optional: 3 USPs für Lifestyle-Ads (Platz für Feature-Zeile unten). */
    usps?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { productId, productName, hook, referenceImageUrl, referenceImageUrls, customSystemPrompt, medium, includePerson, adStyle, usps: bodyUsps } = body;
  if (!hook?.trim()) {
    return NextResponse.json(
      { error: "hook is required" },
      { status: 400 }
    );
  }

  // Google Drive View-Links in Direkt-Download umwandeln (View = HTML, kein Bild)
  function toDirectImageUrl(url: string): string {
    const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    return url;
  }

  // Produkt aus DB laden (für Slug, Beschreibung, Kit-Infos, ggf. Standard-Referenzbild)
  let productSlug = "Heimtest";
  let productDescription: string | null = null;
  let productKitInfo: string | null = null;
  let productRefUrl: string | null = null;

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      productSlug = product.slug;
      productDescription = product.description;
      productKitInfo = product.kitInfo;
      if (product.referenceImageUrl?.trim()) productRefUrl = product.referenceImageUrl.trim();
    }
  } else if (productName?.trim()) {
    productSlug = productName.trim();
  }

  // Alle Referenzbild-URLs sammeln (einzel + Array, max 8). Erst Request, dann Produkt.
  const rawRefs = [
    referenceImageUrl?.trim(),
    ...(Array.isArray(referenceImageUrls) ? referenceImageUrls.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean) : []),
  ].filter(Boolean) as string[];
  const uniqueRefs = [...new Set(rawRefs)];
  const refsToUpload = productRefUrl && !uniqueRefs.length ? [productRefUrl] : uniqueRefs.slice(0, 8);

  // Nano Banana Pro: image_input nur URLs von KIE File-Upload-API
  const refUrls: string[] = [];
  for (const rawUrl of refsToUpload) {
    const u = toDirectImageUrl(rawUrl);
    if (!u.startsWith("https://") || u.length > 2000) {
      return NextResponse.json(
        { error: "Referenzbild-URLs müssen mit https:// beginnen und öffentlich erreichbar sein." },
        { status: 400 }
      );
    }
    try {
      const kieUrl = await uploadReferenceImage(apiKey, u);
      refUrls.push(kieUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload fehlgeschlagen";
      console.error("KIE reference image upload failed:", message);
      return NextResponse.json(
        { error: `Referenzbild konnte nicht an KIE übermittelt werden: ${message}`, detail: message },
        { status: 502 }
      );
    }
  }

  const uspsForPrompt =
    Array.isArray(bodyUsps) && bodyUsps.length >= 2
      ? bodyUsps.slice(0, 3).filter((u) => typeof u === "string" && u.trim())
      : undefined;

  const prompt = buildAdPrompt(
    productSlug,
    hook.trim(),
    refUrls.length > 0,
    customSystemPrompt,
    productDescription,
    productKitInfo,
    includePerson === "person" || includePerson === "couple" ? includePerson : "none",
    adStyle === "lifestyle" ? "lifestyle" : "standard",
    refUrls.length,
    uspsForPrompt
  );

  const formatsToGenerate = getFormatsForMedium(medium ?? "all");
  const results: { aspectRatio: string; taskId: string }[] = [];

  for (const format of formatsToGenerate) {
    const nanoRatio = ASPECT_RATIO_MAP[format.ratio];
    if (!nanoRatio) continue;
    try {
      const { taskId } = await createGenerateTask(apiKey, {
        prompt,
        aspectRatio: nanoRatio,
        ...(refUrls.length > 0 ? { inputImageUrls: refUrls } : {}),
      });
      results.push({ aspectRatio: format.ratio, taskId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`KIE generate failed for ${format.ratio}:`, message);
      return NextResponse.json(
        {
          error: `Generation failed for ${format.ratio}: ${message}`,
          detail: message,
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ taskIds: results });
}
