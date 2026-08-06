/**
 * The document service serializes `created_at` with `datetime.isoformat()` on a
 * naive datetime, so the string carries no offset — "2026-07-28T09:14:22".
 * `new Date()` reads that as local time, which shifts every timestamp by the
 * viewer's offset. The values are UTC, so append a Z when none is present.
 */
export function parseServerDate(value: string): Date {
  return new Date(/[Z+]|-\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)
}

export function formatSize(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function formatDate(value: string): string {
  return parseServerDate(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

// The extension, not the MIME type: `content_type` comes off the browser's own
// guess at upload time and is "application/octet-stream" often enough that a
// column built from it would show blanks.
export function extensionOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase()
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
