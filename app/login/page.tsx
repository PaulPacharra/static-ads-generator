"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError("Ungültiger Benutzername oder Passwort.");
      return;
    }
    if (res?.ok) window.location.href = callbackUrl;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h1 className="text-xl font-bold text-slate-900">Anmelden</h1>
      <p className="mt-1 text-sm text-slate-500">
        Static Ads Generator – Zugang geschützt
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Benutzername
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Passwort
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Wird angemeldet …" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 bg-grid p-4">
      <Suspense fallback={<div className="text-slate-500">Lade …</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
