"use client"

import { useEffect } from "react"

import type { DocumentRecord } from "@/lib/stores/documents"

export default function DeleteDialog({
  document,
  onCancel,
  onConfirm,
}: {
  document: DocumentRecord
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onCancel])

  return (
    <div className="dialog-backdrop" style={{ zIndex: 40 }}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="dialog-title">Delete {document.name}?</div>
        <div className="dialog-body">
          This removes the document and its index. It can&rsquo;t be undone, and any answer
          already on screen keeps referring to it.
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} autoFocus>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
