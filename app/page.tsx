"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AD_FORMATS,
  MEDIA_OPTIONS,
  getFormatsForMedium,
  type MediaId,
} from "@/lib/config";

const STORAGE_KEY = "static-ads-last-session";

type Product = {
  id: string;
  name: string;
  slug: string;
  shopUrl: string | null;
  description: string | null;
  kitInfo: string | null;
  referenceImageUrl: string | null;
};

type TaskState = {
  aspectRatio: string;
  taskId: string;
  status: "pending" | "generating" | "done" | "error";
  imageUrl?: string;
  savedUrl?: string;
  saving?: boolean;
  error?: string;
};

function formatLabel(ratio: string) {
  return AD_FORMATS.find((f) => f.ratio === ratio)?.label ?? ratio;
}

function downloadFile(url: string, filename: string) {
  const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  const a = document.createElement("a");
  a.href = proxyUrl;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [medium, setMedium] = useState<MediaId>("all");
  const [hook, setHook] = useState("");
  const [includePerson, setIncludePerson] = useState<"none" | "person" | "couple">("none");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceUrlPreviewError, setReferenceUrlPreviewError] = useState(false);
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [promptSectionOpen, setPromptSectionOpen] = useState(false);
  // ChatGPT-Ideen: Kontext (Brief) + Vorschläge
  const [ideaContext, setIdeaContext] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] = useState<{
    hooks: string[];
    headlines?: string[];
    descriptions?: string[];
  } | null>(null);

  // Produkte aus DB laden
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) {
          setProducts(data);
          setProductId((prev) => {
            if (data.length === 0) return "";
            if (!prev || !data.some((p) => p.id === prev)) return data[0].id;
            return prev;
          });
        }
      })
      .catch(() => setError("Produkte konnten nicht geladen werden."));
  }, []);

  // Last session from localStorage (nach Produkt-Load, damit productId zu einem echten Produkt passt)
  useEffect(() => {
    if (products.length === 0) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        tasks: TaskState[];
        hook?: string;
        productId?: string;
      };
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        setTasks(data.tasks);
        if (data.hook) setHook(data.hook);
        if (data.productId && products.some((p) => p.id === data.productId)) {
          setProductId(data.productId);
        }
      }
    } catch {
      // ignore
    }
  }, [products]);

  const persistSession = useCallback((nextTasks: TaskState[]) => {
    try {
      const hasAny = nextTasks.some(
        (t) => t.status === "done" && (t.imageUrl || t.savedUrl)
      );
      if (!hasAny) return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks: nextTasks,
          hook,
          productId,
          createdAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
  }, [hook, productId]);

  const loadDefaultPrompt = useCallback(async () => {
    try {
      const res = await fetch("/api/prompt-default");
      const data = await res.json();
      if (res.ok && data.defaultPrompt) setCustomSystemPrompt(data.defaultPrompt);
    } catch {
      setError("Standard-Prompt konnte nicht geladen werden.");
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReferenceFile(null);
      setReferencePreview(null);
      setReferenceUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Bitte ein Bild (JPEG, PNG, WebP) wählen.");
      return;
    }
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
    setReferenceUrl(null);
    setReferenceImageUrl("");
    setError(null);
  }, []);

  const uploadReference = useCallback(async (): Promise<string | null> => {
    if (!referenceFile) return null;
    const form = new FormData();
    form.set("file", referenceFile);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Upload fehlgeschlagen");
    }
    const { url } = await res.json();
    return url;
  }, [referenceFile]);

  const saveImageToBlob = useCallback(
    async (imageUrl: string, aspectRatio: string): Promise<string | null> => {
      const res = await fetch("/api/save-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, aspectRatio }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.savedUrl ?? null;
    },
    []
  );

  const pollTask = useCallback(
    async (taskId: string): Promise<{ url?: string; error?: string }> => {
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const res = await fetch(
          `/api/status?taskId=${encodeURIComponent(taskId)}`
        );
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Status fehlgeschlagen" };
        if (data.status === 1 && data.resultImageUrl)
          return { url: data.resultImageUrl };
        if (data.status === 2 || data.status === 3)
          return { error: data.errorMessage || "Generierung fehlgeschlagen" };
        await new Promise((r) => setTimeout(r, 3000));
      }
      return { error: "Timeout" };
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!hook.trim()) {
      setError("Bitte einen Hook / Aufhänger eingeben.");
      return;
    }
    setError(null);
    setLoading(true);
    const pastedUrl = referenceImageUrl.trim() || null;
    let refUrl: string | null = pastedUrl ?? referenceUrl ?? null;
    if (!refUrl && referenceFile) {
      try {
        refUrl = await uploadReference();
        if (refUrl) setReferenceUrl(refUrl);
      } catch (e) {
        setError(
          (e instanceof Error ? e.message : "Upload fehlgeschlagen") +
            " Ohne Vercel Blob: Referenzbild-URL unten einfügen (öffentlicher Bild-Link)."
        );
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          medium,
          hook: hook.trim(),
          includePerson,
          referenceImageUrl: refUrl || undefined,
          customSystemPrompt: customSystemPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Generierung fehlgeschlagen");
        setLoading(false);
        return;
      }

      const taskIds = data.taskIds as {
        aspectRatio: string;
        taskId: string;
      }[];
      setTasks(
        taskIds.map((t) => ({
          aspectRatio: t.aspectRatio,
          taskId: t.taskId,
          status: "generating" as const,
        }))
      );

      for (let i = 0; i < taskIds.length; i++) {
        const { url, error: err } = await pollTask(taskIds[i].taskId);
        const imageUrl = url ?? undefined;
        setTasks((prev) => {
          const next = [...prev];
          const idx = next.findIndex((x) => x.taskId === taskIds[i].taskId);
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              status: imageUrl ? "done" : "error",
              imageUrl,
              error: err,
              saving: !!imageUrl,
            };
          }
          return next;
        });

        // Optional: save to Blob for permanent storage
        if (imageUrl) {
          const savedUrl = await saveImageToBlob(
            imageUrl,
            taskIds[i].aspectRatio
          );
          setTasks((prev) => {
            const next = [...prev];
            const idx = next.findIndex((x) => x.taskId === taskIds[i].taskId);
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                savedUrl: savedUrl ?? undefined,
                saving: false,
              };
            }
            persistSession(next);
            return next;
          });
        } else {
          setTasks((prev) => {
            const next = [...prev];
            const idx = next.findIndex((x) => x.taskId === taskIds[i].taskId);
            if (idx >= 0) next[idx] = { ...next[idx], saving: false };
            persistSession(next);
            return next;
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }, [
    hook,
    productId,
    medium,
    includePerson,
    referenceFile,
    referenceImageUrl,
    referenceUrl,
    customSystemPrompt,
    uploadReference,
    pollTask,
    saveImageToBlob,
    persistSession,
  ]);

  const displayUrl = (t: TaskState) => t.savedUrl || t.imageUrl;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const generatingCount = tasks.filter((t) => t.status === "generating").length;
  const progressLabel =
    tasks.length > 0
      ? `${doneCount}/${tasks.length} fertig${generatingCount > 0 ? ` · ${generatingCount} in Arbeit` : ""}`
      : "";

  const handleDownloadAll = useCallback(() => {
    tasks
      .filter((t) => t.status === "done" && displayUrl(t))
      .forEach((t, i) => {
        const url = displayUrl(t)!;
        setTimeout(
          () => downloadFile(url, `ad-${t.aspectRatio.replace(":", "x")}.png`),
          i * 300
        );
      });
  }, [tasks]);

  const clearSession = useCallback(() => {
    setTasks([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 bg-grid text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Static Ads Generator
            </h1>
            <p className="mt-2 max-w-xl text-slate-600">
              6 Formate für Google & Meta – Hook und optionales Referenzbild,
              die KI erstellt die Ads.
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="opacity-70">⚙</span>
            Heimtests verwalten
          </a>
        </header>

        <section className="mb-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 sm:rounded-3xl">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
            <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
              Einstellungen
            </h2>
          </div>
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Heimtest
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {products.length === 0 && (
                  <option value="">Lade …</option>
                )}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {products.length > 0 && (() => {
                const p = products.find((x) => x.id === productId);
                return p?.shopUrl ? (
                  <a
                    href={p.shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Zum Shop
                    <span aria-hidden>→</span>
                  </a>
                ) : null;
              })()}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Medium (Formate)
              </label>
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value as MediaId)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {MEDIA_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} – {m.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Ideen mit ChatGPT
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                Beschreibe den Anlass (z.B. „Allergiesaison startet bald – wir
                brauchen Ads für Google“). ChatGPT schlägt passende Hooks und
                Anzeigentexte vor.
              </p>
              <textarea
                value={ideaContext}
                onChange={(e) => {
                  setIdeaContext(e.target.value);
                  setSuggestError(null);
                }}
                placeholder="z.B. Allergiesaison startet bald, wir brauchen Ads für Google und Meta"
                rows={2}
                className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!productId) return;
                  setSuggestLoading(true);
                  setSuggestError(null);
                  setSuggestResult(null);
                  try {
                    const res = await fetch("/api/suggest", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        productId,
                        context: ideaContext.trim() || undefined,
                        medium,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? "Fehler");
                    setSuggestResult({
                      hooks: data.hooks ?? [],
                      headlines: data.headlines,
                      descriptions: data.descriptions,
                    });
                  } catch (e) {
                    setSuggestError(
                      e instanceof Error ? e.message : "Ideen konnten nicht geladen werden."
                    );
                  } finally {
                    setSuggestLoading(false);
                  }
                }}
                disabled={suggestLoading || !productId}
                className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                {suggestLoading ? "Ideen werden erstellt …" : "Ideen & Hooks vorschlagen"}
              </button>
              {suggestError && (
                <p className="mt-3 text-sm text-red-600">{suggestError}</p>
              )}
              {suggestResult && (
                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                  {suggestResult.hooks.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-500">
                        Hooks (Klick übernimmt als Aufhänger)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestResult.hooks.map((h, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setHook(h)}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-sm text-indigo-900 transition hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {suggestResult.headlines && suggestResult.headlines.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-500">
                        Schlagzeilen
                      </p>
                      <ul className="space-y-1.5">
                        {suggestResult.headlines.map((line, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-sm text-slate-700">{line}</span>
                            <button
                              type="button"
                              onClick={() => setHook(line)}
                              className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-300"
                            >
                              Als Hook
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {suggestResult.descriptions &&
                    suggestResult.descriptions.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          Anzeigentexte
                        </p>
                        <ul className="space-y-2">
                          {suggestResult.descriptions.map((desc, i) => (
                            <li
                              key={i}
                              className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"
                            >
                              {desc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Hook / Aufhänger
              </label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="z.B. Schnell Gewissheit von zu Hause"
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Person in der Anzeige
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Optional: Eine Person oder ein Paar im Bild – passt z.B. zu
                Paar-Tests oder „Zu Hause testen“-Hooks.
              </p>
              <select
                value={includePerson}
                onChange={(e) =>
                  setIncludePerson(e.target.value as "none" | "person" | "couple")
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="none">Nur Produkt (keine Person)</option>
                <option value="person">Eine Person integrieren</option>
                <option value="couple">Paar / zwei Personen (z.B. für Paar-Tests)</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setPromptSectionOpen((o) => !o)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <span className="text-slate-400">
                  {promptSectionOpen ? "▼" : "▶"}
                </span>
                System-Prompt konfigurieren
              </button>
              {promptSectionOpen && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-xs text-slate-500">
                    Leer = Standard-Prompt. Eigenen Text = Überschreibung.
                  </p>
                  <textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="Optional: Anweisungen an die KI …"
                    rows={8}
                    className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={loadDefaultPrompt}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
                  >
                    Standard-Prompt laden
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Referenzbild (optional)
              </label>
              <p className="mb-3 text-xs text-slate-500">
                Bild-URL (https://, öffentlich) oder Datei. Google-Drive-Links
                werden automatisch umgewandelt. Datei mit „Jeder mit dem Link”
                teilen.
              </p>
              <input
                type="url"
                value={referenceImageUrl}
                onChange={(e) => {
                  setReferenceImageUrl(e.target.value);
                  setReferenceUrlPreviewError(false);
                  setError(null);
                }}
                placeholder="https://… (Link zum Testkit-Bild)"
                className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex items-center gap-3">
                <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <span className="opacity-80">📁</span>
                  <span className="ml-2">Datei wählen</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              {referencePreview && (
                <img
                  src={referencePreview}
                  alt="Referenz"
                  className="mt-3 max-h-36 rounded-xl border border-slate-200 object-contain shadow-sm"
                />
              )}
              {referenceImageUrl.trim() && !referenceFile && (
                <div className="mt-3">
                  <img
                    src={referenceImageUrl.trim()}
                    alt="Referenz URL"
                    className="max-h-36 rounded-xl border border-slate-200 object-contain shadow-sm"
                    onError={() => setReferenceUrlPreviewError(true)}
                    onLoad={() => setReferenceUrlPreviewError(false)}
                  />
                  {referenceUrlPreviewError && (
                    <p className="mt-2 text-xs text-amber-600">
                      Vorschau fehlgeschlagen. URL wird trotzdem an die KI
                      übergeben.
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm text-red-800">
                <p>{error}</p>
                {(error.includes("AI Studio") || error.includes("400")) && (
                  <p className="mt-2 text-xs text-amber-800">
                    KIE nutzt Googles API. 400 = ungültige Anfrage: Hook kürzen
                    oder ohne Referenzbild testen.
                  </p>
                )}
                {(referenceImageUrl.trim() || referenceFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceImageUrl("");
                      setReferenceFile(null);
                      setReferencePreview(null);
                      setReferenceUrl(null);
                      setError(null);
                    }}
                    className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Referenzbild entfernen und erneut versuchen
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-5 py-4 font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/25 disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {loading
                ? `Generiere … ${progressLabel}`
                : `${getFormatsForMedium(medium).length} Ads generieren (${MEDIA_OPTIONS.find((m) => m.id === medium)?.label ?? "Alle"})`}
            </button>
          </div>
        </section>

        {tasks.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 sm:rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
              <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
                Generierte Ads
                {progressLabel && (
                  <span className="ml-2 font-normal text-slate-500">
                    {progressLabel}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                {doneCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Alle herunterladen
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSession}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Session löschen
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
              {tasks.map((t) => (
                <div
                  key={t.taskId}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/30 transition hover:border-slate-300 hover:bg-slate-50/50"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
                    <span className="text-sm font-medium text-slate-700">
                      {formatLabel(t.aspectRatio)}
                    </span>
                    {t.savedUrl && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        gespeichert
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    {t.status === "generating" && (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-200/60">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                      </div>
                    )}
                    {t.status === "error" && (
                      <div className="rounded-xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-700">
                        <p>{t.error ?? "Fehler"}</p>
                        {(t.error?.includes("E006") ||
                          t.error?.toLowerCase().includes("invalid input")) && (
                          <p className="mt-2 text-xs text-amber-700">
                            Tipp: Öffentliche Referenzbild-URL? Kürzerer oder
                            neutraler Hook?
                          </p>
                        )}
                      </div>
                    )}
                    {t.status === "done" && displayUrl(t) && (
                      <>
                        <a
                          href={displayUrl(t)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                        >
                          <img
                            src={displayUrl(t)!}
                            alt={formatLabel(t.aspectRatio)}
                            className="w-full object-contain"
                          />
                        </a>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              downloadFile(
                                displayUrl(t)!,
                                `ad-${t.aspectRatio.replace(":", "x")}.png`
                              )
                            }
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Download
                          </button>
                          {t.saving && (
                            <span className="text-xs text-slate-500">
                              Speichere …
                            </span>
                          )}
                          {t.savedUrl && (
                            <span className="text-xs text-slate-500">
                              Dauerhaft gespeichert
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
