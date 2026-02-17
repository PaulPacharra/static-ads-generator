import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (e) {
    console.error("Product GET:", e);
    return NextResponse.json(
      { error: "Produkt konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, slug, shopUrl, description, kitInfo, referenceImageUrl } = body;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() ?? "" }),
        ...(slug !== undefined && { slug: slug?.trim() ?? "" }),
        ...(shopUrl !== undefined && { shopUrl: shopUrl?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(kitInfo !== undefined && { kitInfo: kitInfo?.trim() || null }),
        ...(referenceImageUrl !== undefined && {
          referenceImageUrl: referenceImageUrl?.trim() || null,
        }),
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error("Product PATCH:", e);
    return NextResponse.json(
      { error: "Produkt konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Product DELETE:", e);
    return NextResponse.json(
      { error: "Produkt konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
