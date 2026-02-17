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
    /** Optional: überschreibt den Standard-System-Prompt aus der App */
    customSystemPrompt?: string;
    /** Optional: Medium (google | meta | all) – nur diese Formate werden erzeugt */
    medium?: MediaId;
    /** Optional: "person" oder "couple" – Person/Paar in der Anzeige integrieren */
    includePerson?: "none" | "person" | "couple";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { productId, productName, hook, referenceImageUrl, customSystemPrompt, medium, includePerson } = body;
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
  let refImageFromRequest = referenceImageUrl?.trim();

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      productSlug = product.slug;
      productDescription = product.description;
      productKitInfo = product.kitInfo;
      if (!refImageFromRequest && product.referenceImageUrl?.trim()) {
        refImageFromRequest = product.referenceImageUrl.trim();
      }
    }
  } else if (productName?.trim()) {
    productSlug = productName.trim();
  }

  // Nano Banana Pro only accepts image_input URLs from KIE's file-upload API
  let refUrl: string | undefined;
  if (refImageFromRequest) {
    const u = toDirectImageUrl(refImageFromRequest);
    if (!u.startsWith("https://") || u.length > 2000) {
      return NextResponse.json(
        {
          error:
            "Referenzbild-URL muss mit https:// beginnen und öffentlich erreichbar sein.",
        },
        { status: 400 }
      );
    }
    try {
      refUrl = await uploadReferenceImage(apiKey, u);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload fehlgeschlagen";
      console.error("KIE reference image upload failed:", message);
      return NextResponse.json(
        {
          error: `Referenzbild konnte nicht an KIE übermittelt werden: ${message}`,
          detail: message,
        },
        { status: 502 }
      );
    }
  }

  const prompt = buildAdPrompt(
    productSlug,
    hook.trim(),
    Boolean(refUrl),
    customSystemPrompt,
    productDescription,
    productKitInfo,
    includePerson === "person" || includePerson === "couple" ? includePerson : "none"
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
        inputImageUrl: refUrl,
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
