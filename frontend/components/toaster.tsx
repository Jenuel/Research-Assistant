"use client"

import { useToasts } from "@/lib/stores/toasts"

export default function Toaster() {
  const toasts = useToasts((state) => state.toasts)
  const dismiss = useToasts((state) => state.dismiss)

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 60,
        maxWidth: 340,
      }}
      // Toasts report work that has already finished; announcing them politely
      // means a screen reader hears the outcome without losing its place.
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          onClick={() => dismiss(toast.id)}
          style={{
            padding: "12px 14px",
            background: "var(--color-surface)",
            borderLeft: "2px solid var(--color-accent)",
            boxShadow: "var(--shadow-md)",
            animation: "toastIn 160ms ease-out",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 13, fontFamily: "var(--font-heading)", fontWeight: 800 }}>
            {toast.title}
          </div>
          {toast.body && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
              {toast.body}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
