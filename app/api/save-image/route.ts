import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

/**
 * Fetches an image from the given URL and stores it in Vercel Blob (permanent).
 * Body: { imageUrl: string, aspectRatio?: string }
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 503 }
    );
  }

  let body: { imageUrl?: string; aspectRatio?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageUrl, aspectRatio = "1-1" } = body;
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 }
    );
  }

  const safeRatio = aspectRatio.replace(/[^a-z0-9-]/gi, "-");
  const name = `ads/${Date.now()}-${safeRatio}.png`;

  try {
    const res = await fetch(imageUrl, {
      headers: { Accept: "image/*" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${res.status}` },
        { status: 502 }
      );
    }
    const blob = await res.blob();
    const uploaded = await put(name, blob, {
      access: "public",
      contentType: res.headers.get("content-type") || "image/png",
    });
    return NextResponse.json({ savedUrl: uploaded.url });
  } catch (e) {
    console.error("Save image error:", e);
    return NextResponse.json(
      { error: "Could not save image" },
      { status: 500 }
    );
  }
}
