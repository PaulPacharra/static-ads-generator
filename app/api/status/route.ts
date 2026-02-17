import { getTaskStatus } from "@/lib/kie";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KIE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json(
      { error: "taskId query parameter required" },
      { status: 400 }
    );
  }

  try {
    const data = await getTaskStatus(apiKey, taskId);
    return NextResponse.json({
      taskId,
      status: data.status,
      resultImageUrl: data.resultImageUrl ?? null,
      errorMessage: data.errorMessage ?? null,
    });
  } catch (e) {
    console.error("Status check failed:", e);
    return NextResponse.json(
      {
        error: "Status check failed",
        detail: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
