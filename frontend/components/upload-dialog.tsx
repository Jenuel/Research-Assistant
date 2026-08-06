"use client"

import { useEffect, useRef } from "react"

import { CloseIcon, UploadMark } from "@/components/icons"
import { ACCEPT_ATTRIBUTE, useUploads, type UploadItem } from "@/lib/stores/uploads"

const STATUS_LABEL: Record<UploadItem["status"], string> = {
  queued: "Queued",
  uploading: "",
  indexing: "Indexing",
  done: "Done",
  error: "Failed",
}

function statusLabel(item: UploadItem): string {
  return item.status === "uploading" ? `${item.progress}%` : STATUS_LABEL[item.status]
}

/** The bar reads full for anything past the wire: indexing, done, or failed. */
function barWidth(item: UploadItem): string {
  if (item.status === "queued") return "0%"
  if (item.status === "uploading") return `${item.progress}%`

  return "100%"
}

function barColor(item: UploadItem): string {
  if (item.status === "error") return "var(--color-accent)"
  if (item.status === "indexing") return "color-mix(in srgb,var(--color-accent) 45%,transparent)"

  return "var(--color-text)"
}

export default function UploadDialog({ onClose }: { onClose: () => void }) {
  const items = useUploads((state) => state.items)
  const running = useUploads((state) => state.running)
  const finished = useUploads((state) => state.finished)
  const dragging = useUploads((state) => state.dragging)
  const { addFiles, retryFailed, setDragging } = useUploads.getState()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Escape closes, except while files are in flight — a half-run batch has no
  // way to report itself once the dialog is gone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !running) onClose()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, running])

  const done = items.filter((item) => item.status === "done").length
  const hasRetryable = finished && items.some((item) => item.status === "error" && item.retryable)

  return (
    <div className="dialog-backdrop" style={{ zIndex: 40 }}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Upload documents"
        style={{
          width: "min(560px,100%)",
          height: "min(560px,86dvh)",
          overflow: "auto",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="dialog-title">Upload documents</div>
          <span
            className="text-muted"
            style={{ marginLeft: "auto", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
          >
            10 MB per file
          </span>
          <button
            className="btn btn-icon dialog-close"
            style={{ borderRadius: "50%" }}
            aria-label="Close upload dialog"
            onClick={onClose}
            disabled={running}
          >
            <CloseIcon />
          </button>
        </div>
        <hr className="hr" style={{ margin: 0 }} />

        <div
          style={{
            flex: items.length ? "none" : 1,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            minHeight: items.length ? 150 : 220,
            padding: 22,
            border: `1px dashed ${
              dragging ? "var(--color-accent)" : "color-mix(in srgb,var(--color-text) 22%,transparent)"
            }`,
            background: dragging
              ? "color-mix(in srgb,var(--color-accent) 10%,transparent)"
              : "var(--color-bg)",
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!dragging) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            addFiles(Array.from(event.dataTransfer.files))
          }}
        >
          <UploadMark />
          <div style={{ fontSize: 15 }}>{dragging ? "Release to add files" : "Drag files here"}</div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            PDF, DOCX or TXT
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              className="btn btn-secondary"
              style={{ borderRadius: 999, paddingInline: 18 }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose files
            </button>
          </div>
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []))
              // Clearing lets the same file be picked again after a failure;
              // otherwise the change event never fires a second time.
              event.target.value = ""
            }}
          />
        </div>

        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "10px 12px",
                  background: "color-mix(in srgb,var(--color-text) 5%,transparent)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span
                    style={{
                      fontSize: 13,
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      fontVariantNumeric: "tabular-nums",
                      color:
                        item.status === "error"
                          ? "var(--color-accent-300)"
                          : "color-mix(in srgb,var(--color-text) 60%,transparent)",
                    }}
                  >
                    {statusLabel(item)}
                  </span>
                </div>
                <div style={{ height: 3, background: "var(--color-surface-hi)" }}>
                  <div
                    style={{
                      height: 3,
                      width: barWidth(item),
                      background: barColor(item),
                      transition: "width 120ms linear",
                    }}
                  />
                </div>
                {item.error && (
                  <div style={{ fontSize: 12, color: "var(--color-accent-300)" }}>{item.error}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {finished && items.length > 0 && (
          <div
            style={{
              padding: 12,
              borderLeft: "2px solid var(--color-accent)",
              background: "var(--color-bg)",
              fontSize: 13,
            }}
          >
            {done} of {items.length} uploaded.
          </div>
        )}

        {hasRetryable && (
          <button
            className="btn btn-secondary"
            style={{ alignSelf: "flex-start", borderRadius: 999, paddingInline: 18 }}
            onClick={retryFailed}
          >
            Retry failed
          </button>
        )}
      </div>
    </div>
  )
}
