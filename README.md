# Static Ads Generator – Heimtests

Web-App zum Erzeugen von **statischen Werbebildern** für Heimtests in 6 Formaten (1:1, 16:9, 4:3, 3:4, 9:16, 21:9) für Google & Meta. Nutzt die **KIE API** ([Nano Banana Pro](https://kie.ai/nano-banana-pro) – Gemini 3.0 Pro Image) für die Bildgenerierung.

## Voraussetzungen

- [KIE API](https://kie.ai/api-key) Account und API-Key
- **Datenbank:** [Supabase](https://supabase.com) (PostgreSQL) – für lokal und Vercel
- Optional: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) für Referenzbild-Upload

## Lokal starten

1. **Supabase:** Projekt unter [supabase.com](https://supabase.com) anlegen. Unter **Settings → Database** die **Connection string (URI)** kopieren (Mode: Transaction, Port 6543 für Pooler).
2. **Umgebung:**

```bash
cp .env.example .env.local
# In .env.local eintragen: KIE_API_KEY, OPENAI_API_KEY (optional), DATABASE_URL (Supabase-URI)
npm install
npm run db:migrate:deploy   # einmalig: Tabellen in Supabase anlegen
npm run db:seed             # einmalig: Standard-Heimtests einfügen (optional)
npm run dev
```

**Heimtests verwalten:** Im Browser [http://localhost:3000/admin](http://localhost:3000/admin) öffnen – dort Produkte anlegen/bearbeiten, Shop-URL, Beschreibung und Kit-Infos eintragen. Diese Infos fließen in den KI-Prompt und können die generierten Bilder passender machen.

Öffne [http://localhost:3000](http://localhost:3000).

**Hinweis:** Referenzbild-Upload benötigt `BLOB_READ_WRITE_TOKEN` (Vercel Blob). Ohne Token kannst du nur ohne Referenzbild generieren (nur Hook + Produkt).

## Deployment (Vercel + Supabase)

### 1. Supabase einrichten

1. [Supabase](https://supabase.com) → neues Projekt anlegen (Region wählen, Passwort für DB setzen).
2. **Settings → Database** → unter **Connection string** die **URI** wählen (z. B. **Transaction** mit Port **6543**, Pooler). Diese URL für `DATABASE_URL` verwenden.

### 2. Git & Vercel

1. **Git** (falls noch nicht geschehen, im Ordner `static-ads-app`):
   ```bash
   cd static-ads-app
   git init
   git add .
   git commit -m "Initial commit: Static Ads Generator"
   ```
2. Repo auf GitHub/GitLab/Bitbucket pushen.
3. [Vercel](https://vercel.com) → **Add New Project** → Repo importieren.
4. **Root Directory:** auf `static-ads-app` setzen (falls das Repo den Ordner enthält) oder Root lassen, wenn das Repo nur den App-Inhalt hat.
5. **Environment Variables** eintragen:
   - **KIE_API_KEY** (erforderlich)
   - **DATABASE_URL** = Supabase Connection URI (aus Schritt 1)
   - **OPENAI_API_KEY** (optional, für Ideen & Hooks)
   - **BLOB_READ_WRITE_TOKEN** (optional, Vercel Dashboard → Storage → Blob)
6. **Deploy** starten.

### 3. Tabellen in Supabase (einmalig)

Vercel kann die direkte DB-URL (Port 5432) oft nicht erreichen. **Tabelle einmalig selbst anlegen:**

1. [Supabase](https://supabase.com) → dein Projekt → **SQL Editor** → **New query**
2. Inhalt der Datei **`supabase-init.sql`** aus dem Repo kopieren, einfügen, **Run** klicken.

Damit ist die Tabelle `Product` angelegt; die App (lokal und auf Vercel) kann Heimtests speichern. Optional: lokal `npm run db:seed` für Beispiel-Heimtests (mit derselben `DATABASE_URL`).

## Ablauf

1. **Heimtest** auswählen (z. B. Vitamin D, Schilddrüse).
2. **Hook / Aufhänger** eingeben (z. B. „Schnell Gewissheit von zu Hause“).
3. Optional **Referenzbild** (URL oder Upload), damit die KI das Produkt erkennt.
4. **„6 Ads generieren“** → 6 Formate werden bei KIE erstellt, Fortschritt wird angezeigt.
5. Fertige Bilder: **Download** pro Format oder **„Alle herunterladen“**. Wenn Vercel Blob konfiguriert ist, werden Bilder automatisch dauerhaft bei euch gespeichert (nicht nur 14 Tage bei KIE).
6. **Letzte Session** bleibt nach Reload erhalten (localStorage); **„Session löschen“** entfernt die Anzeige.

Produkte und Formate in `lib/config.ts`; System-Prompt in `lib/prompts.ts` (auch in der App konfigurierbar).
