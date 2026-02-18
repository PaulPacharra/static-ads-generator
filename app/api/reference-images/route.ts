import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const list = await prisma.referenceImage.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("ReferenceImages GET:", e);
    return NextResponse.json(
      { error: "Referenzbilder konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, label } = body as { url?: string; label?: string };
    if (!url || typeof url !== "string" || !url.trim().startsWith("https://")) {
      return NextResponse.json(
        { error: "Eine gültige URL (https://…) ist erforderlich." },
        { status: 400 }
      );
    }
    const created = await prisma.referenceImage.create({
      data: {
        url: url.trim(),
        label: typeof label === "string" && label.trim() ? label.trim() : null,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("ReferenceImages POST:", e);
    return NextResponse.json(
      { error: "Referenzbild konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
