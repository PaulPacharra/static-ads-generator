/**
 * KIE API – Nano Banana Pro (Gemini 3.0 Pro Image)
 * https://kie.ai/nano-banana-pro
 * https://docs.kie.ai/market/google/pro-image-to-image
 *
 * image_input: "File URL after upload" – zuerst über KIE File Upload,
 * dann die zurückgegebene downloadUrl übergeben. Akzeptierte Typen: JPEG, PNG, WEBP.
 */

const JOBS_BASE = "https://api.kie.ai/api/v1/jobs";
const FILE_UPLOAD_BASE = "https://kieai.redpandaai.co";
const MODEL = "nano-banana-pro";

export type NanoBananaAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9"
  | "auto";

export interface GenerateInput {
  prompt: string;
  aspectRatio: NanoBananaAspectRatio;
  inputImageUrl?: string;
  resolution?: "1K" | "2K" | "4K";
}

export interface CreateTaskResponse {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

export interface RecordInfoData {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  resultJson?: string;
  failCode?: string;
  failMsg?: string;
}

export interface RecordInfoResponse {
  code: number;
  msg?: string;
  data?: RecordInfoData;
}

/** Erlaubte Endungen für Nano Banana Pro image_input (laut KIE: image/jpeg, image/png, image/webp). */
const REF_EXT = /\.(jpe?g|png|webp)(\?|$)/i;

/**
 * Referenzbild-URL bei KIE hochladen. Nano Banana Pro akzeptiert nur URLs
 * von diesem Endpoint („file type not supported“ sonst).
 * fileName mit korrekter Endung (.jpg/.png/.webp), damit der Typ erkannt wird.
 * https://docs.kie.ai/file-upload-api/upload-file-url
 */
export async function uploadReferenceImage(
  apiKey: string,
  imageUrl: string
): Promise<string> {
  const match = imageUrl.match(REF_EXT);
  const ext = match ? match[1].toLowerCase().replace("jpeg", "jpg") : "png";
  const fileName = `ref-${Date.now()}.${ext}`;

  const res = await fetch(`${FILE_UPLOAD_BASE}/api/file-url-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl: imageUrl,
      uploadPath: "ads/reference",
      fileName,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    code?: number;
    msg?: string;
    data?: { downloadUrl?: string };
  };

  if (!json.success || !json.data?.downloadUrl) {
    throw new Error(
      json.msg ?? `Upload failed: ${res.status}`
    );
  }
  return json.data.downloadUrl;
}

/** Map our config ratios to Nano Banana Pro (omit unsupported). */
export const ASPECT_RATIO_MAP: Record<string, NanoBananaAspectRatio> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "4:3": "4:3",
  "3:4": "3:4",
  "9:16": "9:16",
  "21:9": "21:9",
  "2:3": "2:3",
  "3:2": "3:2",
  "4:5": "4:5",
  "5:4": "5:4",
};

export async function createGenerateTask(
  apiKey: string,
  input: GenerateInput
): Promise<{ taskId: string }> {
  const body = {
    model: MODEL,
    input: {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      resolution: input.resolution ?? "1K",
      output_format: "png",
      ...(input.inputImageUrl
        ? { image_input: [input.inputImageUrl] }
        : {}),
    },
  };

  const res = await fetch(`${JOBS_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let json: CreateTaskResponse & { code?: number; message?: string; msg?: string } =
    await res.json().catch(() => ({}));

  if (json.code !== 200 || !json.data?.taskId) {
    const msg =
      json.msg ??
      (json as { message?: string }).message ??
      (res.ok ? "Missing taskId" : `HTTP ${res.status}`);
    const code = json.code ?? res.status;
    throw new Error(`KIE ${code}: ${msg}`);
  }
  return { taskId: json.data.taskId };
}

export async function getTaskStatus(
  apiKey: string,
  taskId: string
): Promise<{
  status: 0 | 1 | 2 | 3;
  resultImageUrl?: string;
  errorMessage?: string;
}> {
  const res = await fetch(
    `${JOBS_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  const json: RecordInfoResponse = await res.json();
  if (json.code !== 200) {
    throw new Error(json.msg ?? `KIE status error: ${res.status}`);
  }

  const data = json.data;
  if (!data) {
    return { status: 2, errorMessage: "No task data" };
  }

  if (data.state === "success" && data.resultJson) {
    try {
      const parsed = JSON.parse(data.resultJson) as {
        resultUrls?: string[];
        result_urls?: string[];
      };
      const urls = parsed.resultUrls ?? parsed.result_urls ?? [];
      const firstUrl = urls[0];
      return {
        status: 1,
        resultImageUrl: firstUrl,
      };
    } catch {
      return { status: 2, errorMessage: "Invalid result format" };
    }
  }

  if (data.state === "fail") {
    return {
      status: 3,
      errorMessage: data.failMsg ?? data.failCode ?? "Generation failed",
    };
  }

  return { status: 0 };
}
