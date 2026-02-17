import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error("Products GET:", e);
    return NextResponse.json(
      { error: "Produkte konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, shopUrl, description, kitInfo, referenceImageUrl } = body;
    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "name und slug sind erforderlich" },
        { status: 400 }
      );
    }
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        shopUrl: shopUrl?.trim() || null,
        description: description?.trim() || null,
        kitInfo: kitInfo?.trim() || null,
        referenceImageUrl: referenceImageUrl?.trim() || null,
      },
    });
    return NextResponse.json(product);
  } catch (e) {
    console.error("Products POST:", e);
    return NextResponse.json(
      { error: "Produkt konnte nicht angelegt werden" },
      { status: 500 }
    );
  }
}
