import { NextResponse } from "next/server";

/**
 * Proxy-Download: Bild von externer URL holen und mit Content-Disposition
 * ausliefern. Nötig, weil Browser bei cross-origin URLs das download-Attribut
 * oft ignorieren.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") || "download.png";

  if (!url || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "Invalid or missing url (must be https)" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const blob = await res.blob();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
      },
    });
  } catch (e) {
    console.error("Proxy download failed:", e);
    return NextResponse.json(
      { error: "Download fehlgeschlagen" },
      { status: 502 }
    );
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-()]/g, "_").slice(0, 200) || "download.png";
}
