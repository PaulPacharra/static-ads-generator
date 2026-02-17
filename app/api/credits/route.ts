import { NextResponse } from "next/server";
import { getCredits } from "@/lib/kie";

export async function GET() {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KIE_API_KEY is not configured" },
      { status: 500 }
    );
  }
  const credits = await getCredits(apiKey);
  if (credits === null) {
    return NextResponse.json(
      { error: "Credits could not be fetched" },
      { status: 502 }
    );
  }
  return NextResponse.json({ credits });
}
