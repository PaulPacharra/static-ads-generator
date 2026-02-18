import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";

export type SuggestResponse = {
  hooks: string[];
  headlines?: string[];
  descriptions?: string[];
  usps?: string[];
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY ist nicht konfiguriert." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const body = await request.json();
    const { productId, context, medium } = body as {
      productId?: string;
      context?: string;
      medium?: string;
    };

    let productBlock: string;
    if (productId?.trim()) {
      const product = await prisma.product.findUnique({
        where: { id: productId.trim() },
      });
      if (!product) {
        return NextResponse.json(
          { error: "Produkt nicht gefunden." },
          { status: 404 }
        );
      }
      productBlock = [
        `Produkt: ${product.name} (Slug: ${product.slug}).`,
        product.description && `Beschreibung/Nutzen: ${product.description}`,
        product.kitInfo && `Kit-Inhalt: ${product.kitInfo}`,
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      productBlock = "Produkt: Allgemeiner Heimtest (at-home health test). Kein konkretes Produkt ausgewählt – generische Ideen für Werbetexte.";
    }

    const contextText =
      typeof context === "string" && context.trim()
        ? context.trim()
        : "Allgemeine Werbekampagne.";
    const mediumHint =
      medium === "google"
        ? " Die Anzeigen sind für Google Ads (Responsive, Display, YouTube)."
        : medium === "meta"
          ? " Die Anzeigen sind für Meta (Facebook & Instagram Feed und Stories)."
          : " Die Anzeigen können für Google und Meta genutzt werden.";

    const systemPrompt = `Du bist Werbetexter für seriöse Heimtests (z.B. Vitamin D, Allergie). Deine Texte sind auf Deutsch, werblich aber seriös, ohne Heil- oder Diagnoseversprechen. Ziel: Anzeigen für Google Ads und Meta (Facebook/Instagram). Wichtig: Die Zielgruppe wird immer geduzt – alle Texte in Du-Form („du“, „dein“, „dir“), niemals in Sie-Form.`;

    const userPrompt = `Der Kunde hat diesen Heimtest ausgewählt:

${productBlock}

Sein Kontext / seine Kampagne: ${contextText}${mediumHint}

Antworte NUR mit einem einzigen JSON-Objekt (kein anderer Text), Format:
{
  "hooks": ["Kurzer Werbe-Hook 1", "Hook 2", ...],
  "headlines": ["Schlagzeile 1", "Schlagzeile 2", ...],
  "descriptions": ["Kurzer Anzeigentext 1 (1-2 Sätze)", ...],
  "usps": ["USP 1 (2–4 Wörter)", "USP 2", "USP 3", ...]
}

Vorgaben:
- hooks: 8–10 kurze Werbe-Hooks (je ein Satz, max. ca. 15 Wörter), die als Aufhänger für Bild-Anzeigen dienen.
- headlines: 5–6 kurze Schlagzeilen für Anzeigen.
- descriptions: 3–4 kurze Anzeigentexte (1–2 Sätze) für die Anzeigenbeschreibung.
- usps: 6–8 kurze Unique Selling Points (je 2–4 Wörter), wie sie in Lifestyle-Ads unten unter Icons stehen (z.B. „Schnelle Ergebnisse“, „Diskret & Sicher“, „Sichere Übermittlung“). Keine Sätze, nur prägnante Stichpunkte.

Alles auf Deutsch, an den Kontext angepasst. Durchgehend Du-Form (die Kund:innen werden geduzt, keine Sie-Form).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Keine Antwort von der KI erhalten." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as {
      hooks?: string[];
      headlines?: string[];
      descriptions?: string[];
      usps?: string[];
    };
    const hooks = Array.isArray(parsed.hooks)
      ? parsed.hooks.filter((h) => typeof h === "string" && h.trim())
      : [];
    const headlines = Array.isArray(parsed.headlines)
      ? parsed.headlines.filter((h) => typeof h === "string" && h.trim())
      : [];
    const descriptions = Array.isArray(parsed.descriptions)
      ? parsed.descriptions.filter((d) => typeof d === "string" && d.trim())
      : [];
    const usps = Array.isArray(parsed.usps)
      ? parsed.usps.filter((u) => typeof u === "string" && u.trim()).slice(0, 10)
      : [];

    return NextResponse.json({
      hooks,
      headlines: headlines.length > 0 ? headlines : undefined,
      descriptions: descriptions.length > 0 ? descriptions : undefined,
      usps: usps.length > 0 ? usps : undefined,
    } satisfies SuggestResponse);
  } catch (e) {
    console.error("Suggest API error:", e);
    const message =
      e instanceof Error ? e.message : "Unbekannter Fehler bei der KI-Anfrage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
