"use client";

import { useState, useEffect, useCallback } from "react";
import { getReferenceImagePreviewUrl } from "@/lib/reference-image-preview";

type Product = {
  id: string;
  name: string;
  slug: string;
  shopUrl: string | null;
  description: string | null;
  kitInfo: string | null;
  referenceImageUrl: string | null;
};

type ReferenceImage = {
  id: string;
  url: string;
  label: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    shopUrl: "",
    description: "",
    kitInfo: "",
    referenceImageUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<ReferenceImage[]>([]);
  const [refUrl, setRefUrl] = useState("");
  const [refLabel, setRefLabel] = useState("");
  const [refSaving, setRefSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setProducts(data));
  }, []);

  const loadRefImages = useCallback(() => {
    fetch("/api/reference-images")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRefImages(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadRefImages();
  }, [loadRefImages]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (editing) {
        const res = await fetch(`/api/products/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name || undefined,
            slug: form.slug || undefined,
            shopUrl: form.shopUrl || null,
            description: form.description || null,
            kitInfo: form.kitInfo || null,
            referenceImageUrl: form.referenceImageUrl || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setMessage("Gespeichert.");
        setEditing(null);
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            slug: form.slug,
            shopUrl: form.shopUrl || null,
            description: form.description || null,
            kitInfo: form.kitInfo || null,
            referenceImageUrl: form.referenceImageUrl || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setMessage("Produkt angelegt.");
        setForm({ name: "", slug: "", shopUrl: "", description: "", kitInfo: "", referenceImageUrl: "" });
      }
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      shopUrl: p.shopUrl ?? "",
      description: p.description ?? "",
      kitInfo: p.kitInfo ?? "",
      referenceImageUrl: p.referenceImageUrl ?? "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Produkt wirklich löschen?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const addRefImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refUrl.trim().startsWith("https://")) {
      setMessage("Bitte eine gültige URL (https://…) eingeben.");
      return;
    }
    setRefSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reference-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: refUrl.trim(), label: refLabel.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setMessage("Referenzbild gespeichert.");
      setRefUrl("");
      setRefLabel("");
      loadRefImages();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fehler");
    } finally {
      setRefSaving(false);
    }
  };

  const removeRefImage = async (id: string) => {
    if (!confirm("Referenzbild aus der Bibliothek entfernen?")) return;
    const res = await fetch(`/api/reference-images/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadRefImages();
      setMessage("Referenzbild entfernt.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-grid p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Heimtests verwalten
          </h1>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <span aria-hidden>←</span>
            Zurück zum Generator
          </a>
        </header>

        {message && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <form
          onSubmit={save}
          className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 sm:rounded-3xl"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
            <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
              {editing ? "Produkt bearbeiten" : "Neues Produkt"}
            </h2>
          </div>
          <div className="space-y-4 p-6 sm:p-8">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Name (Dropdown)
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Slug (für KI-Prompt)
              </label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Shop-URL (optional)
              </label>
              <input
                type="url"
                value={form.shopUrl}
                onChange={(e) => setForm((f) => ({ ...f, shopUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Beschreibung (für KI, Nutzen/Zielgruppe, optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                rows={2}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kit-Infos (für KI, z.B. Inhalt des Sets, optional)
              </label>
              <textarea
                value={form.kitInfo}
                onChange={(e) => setForm((f) => ({ ...f, kitInfo: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                rows={2}
                placeholder="z.B. Lanzette, Probenröhrchen, Rücksendeumschlag"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Standard-Referenzbild-URL (optional)
              </label>
              <input
                type="url"
                value={form.referenceImageUrl}
                onChange={(e) => setForm((f) => ({ ...f, referenceImageUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="https://… (optional)"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#0E4D2F] px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#0b3c24] disabled:opacity-50"
              >
                {editing ? "Speichern" : "Anlegen"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ name: "", slug: "", shopUrl: "", description: "", kitInfo: "", referenceImageUrl: "" });
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>
              )}
            </div>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 sm:rounded-3xl">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
            <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
              Alle Heimtests
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 p-4 sm:p-6">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/30 p-4 transition hover:border-slate-200 hover:bg-slate-50/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.shopUrl && (
                    <a
                      href={p.shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Shop →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50 sm:rounded-3xl">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-8">
            <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
              Referenzbilder-Bibliothek
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              URLs hier speichern – im Generator können sie per Klick übernommen werden. Google-Drive-Links zeigen eine Vorschau.
            </p>
          </div>
          <div className="space-y-4 p-6 sm:p-8">
            <form onSubmit={addRefImage} className="flex flex-wrap gap-3">
              <input
                type="url"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
                placeholder="https://… (z.B. Google Drive Link)"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="text"
                value={refLabel}
                onChange={(e) => setRefLabel(e.target.value)}
                placeholder="Name (optional)"
                className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={refSaving}
                className="rounded-xl bg-[#0E4D2F] px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-[#0b3c24] disabled:opacity-50"
              >
                {refSaving ? "Speichern …" : "Hinzufügen"}
              </button>
            </form>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {refImages.map((ref) => (
                <li
                  key={ref.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <img
                        src={getReferenceImagePreviewUrl(ref.url)}
                        alt={ref.label ?? "Vorschau"}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' fill='%94a3b8'%3E%3Crect width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%64748b'%3E?%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {ref.label || "Ohne Name"}
                      </p>
                      <p className="truncate text-xs text-slate-500" title={ref.url}>
                        {ref.url}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRefImage(ref.id)}
                    className="self-start rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
            {refImages.length === 0 && (
              <p className="text-sm text-slate-500">
                Noch keine Referenzbilder. URL oben eingeben und „Hinzufügen“ klicken.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
