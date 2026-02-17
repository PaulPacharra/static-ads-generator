import { DEFAULT_SYSTEM_CONTEXT } from "@/lib/prompts";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ defaultPrompt: DEFAULT_SYSTEM_CONTEXT });
}
