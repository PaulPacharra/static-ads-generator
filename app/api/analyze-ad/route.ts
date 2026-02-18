import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Optional: Referenz-Ad mit OpenAI Vision analysieren.
 * Liefert Struktur (Zonen), extrahierte Texte und Vorschläge für USPs.
 */
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
    const { imageUrl } = body as { imageUrl?: string };
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim().startsWith("https://")) {
      return NextResponse.json(
        { error: "Eine gültige Bild-URL (https://…) ist erforderlich." },
        { status: 400 }
      );
    }

    let urlToUse = imageUrl.trim();
    // Google-Drive-View-Links liefern HTML – Vision braucht die direkte Bild-URL
    const driveMatch = urlToUse.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      urlToUse = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analysiere diese Werbeanzeige (Bild). Antworte NUR mit einem JSON-Objekt (kein anderer Text), Format:
{
  "structure": {
    "zones": ["1. Logo/Brand oben", "2. Textzeilen in Boxen", "3. Hauptbild (Person/Produkt)", "4. Große Headline (Overlay)", "5. Feature-Zeile unten (3 Icons + Text)"]
  },
  "extractedText": {
    "headline": "…",
    "subline": "…",
    "usps": ["USP 1", "USP 2", "USP 3"]
  },
  "mood": "Kurze Beschreibung Stimmung/Farben (1 Satz)"
}
Erkennbare Texte (Headline, USPs) auf Deutsch extrahieren. USPs: genau 3 kurze Stichpunkte (2–4 Wörter), wie unten unter den Icons.`,
            },
            { type: "image_url", image_url: { url: urlToUse } },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Keine Analyse erhalten." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(raw) as {
      structure?: { zones?: string[] };
      extractedText?: { headline?: string; subline?: string; usps?: string[] };
      mood?: string;
    };

    return NextResponse.json({
      structure: parsed.structure ?? { zones: [] },
      extractedText: parsed.extractedText ?? {},
      mood: parsed.mood ?? "",
    });
  } catch (e) {
    console.error("Analyze-ad error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
