import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload an image file (JPEG, PNG, WebP)" },
      { status: 400 }
    );
  }

  try {
    const blob = await put(`ref-${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "Upload failed. Is BLOB_READ_WRITE_TOKEN set?" },
      { status: 500 }
    );
  }
}
