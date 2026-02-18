import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.referenceImage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ReferenceImage DELETE:", e);
    return NextResponse.json(
      { error: "Referenzbild konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
