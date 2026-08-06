/** The sign-in hero: circle, dot, triangle, bar. */
export function BrandMark() {
  return (
    <svg
      width="252"
      height="84"
      viewBox="0 0 252 84"
      aria-hidden="true"
      style={{ display: "block", marginBottom: 34 }}
    >
      <circle cx="42" cy="42" r="40" fill="none" stroke="var(--color-text)" strokeWidth="2" />
      <circle cx="42" cy="42" r="18" fill="var(--color-accent)" />
      <path d="M104 82 L146 2 L188 82 Z" fill="none" stroke="var(--color-text)" strokeWidth="2" />
      <rect x="212" y="2" width="38" height="80" fill="var(--color-accent)" />
    </svg>
  )
}

export function WarningTriangle() {
  return (
    <svg width="15" height="14" viewBox="0 0 16 14" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M8 0 L16 14 H0 Z" fill="var(--color-accent)" />
    </svg>
  )
}

export function CheckMark() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-bg)"
      strokeWidth="3.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  )
}

export function UploadMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" style={{ marginBottom: 6 }}>
      <circle cx="22" cy="22" r="21" fill="none" stroke="var(--color-divider)" strokeWidth="2" />
      <path
        d="M22 31 V13 M14 21 L22 13 L30 21"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
    </svg>
  )
}

export function EmptyLibraryMark() {
  return (
    <svg width="96" height="56" viewBox="0 0 96 56" aria-hidden="true">
      <circle cx="28" cy="28" r="27" fill="none" stroke="var(--color-divider)" strokeWidth="2" />
      <path d="M28 1 A27 27 0 0 1 55 28 L28 28 Z" fill="var(--color-accent)" />
      <rect x="70" y="1" width="24" height="54" fill="none" stroke="var(--color-divider)" strokeWidth="2" />
    </svg>
  )
}
