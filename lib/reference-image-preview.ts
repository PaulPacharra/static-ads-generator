/**
 * Google-Drive-Link zu einer Vorschaubild-URL umwandeln.
 * Unterstützt: /file/d/ID/view und /open?id=ID
 * Die Thumbnail-URL funktioniert nur, wenn die Datei "Jeder mit Link" lesen kann.
 */
export function getReferenceImagePreviewUrl(url: string): string {
  if (!url?.trim()) return url;
  const u = url.trim();
  // drive.google.com/file/d/FILE_ID/...
  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w200`;
  }
  // drive.google.com/open?id=FILE_ID
  const openMatch = u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w200`;
  }
  // Kein Drive-Link: URL unverändert (normale Bild-URLs funktionieren direkt)
  return u;
}
