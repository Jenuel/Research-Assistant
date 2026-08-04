"use client"

import { useMemo } from "react"

import { CheckMark, EmptyLibraryMark, TrashIcon } from "@/components/icons"
import { formatDate, formatSize } from "@/lib/format"
import {
  kindLabel,
  useDocuments,
  visibleDocuments,
  type DocumentRecord,
  type SortKey,
} from "@/lib/stores/documents"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
]

const ROW_BORDER = "1px solid color-mix(in srgb,var(--color-text) 9%,transparent)"

export default function LibraryPanel({
  onOpenUpload,
  onRequestDelete,
}: {
  onOpenUpload: () => void
  onRequestDelete: (document: DocumentRecord) => void
}) {
  const documents = useDocuments((state) => state.documents)
  const selected = useDocuments((state) => state.selected)
  const deleting = useDocuments((state) => state.deleting)
  const status = useDocuments((state) => state.status)
  const error = useDocuments((state) => state.error)
  const search = useDocuments((state) => state.search)
  const sortKey = useDocuments((state) => state.sortKey)

  const { fetchDocuments, toggle, selectMany, deselectMany, clearSelection, setSearch, setSortKey } =
    useDocuments.getState()

  const visible = useMemo(
    () => visibleDocuments(documents, search, sortKey),
    [documents, search, sortKey],
  )

  const allVisibleSelected = visible.length > 0 && visible.every((doc) => selected.has(doc.id))

  const loading = status === "loading"
  const failed = status === "error"
  const empty = status === "ready" && documents.length === 0
  const noMatches = status === "ready" && documents.length > 0 && visible.length === 0

  const selectAllLabel = allVisibleSelected
    ? "Deselect shown"
    : search
      ? `Select ${visible.length} matches`
      : "Select all"

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        borderRight: "1px solid var(--color-divider)",
      }}
    >
      <div
        style={{
          flex: "none",
          padding: "16px 20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h6 style={{ margin: 0 }}>Library</h6>
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto", borderRadius: 999, paddingInline: 18 }}
            onClick={onOpenUpload}
          >
            Upload
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="Search filenames"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search documents by filename"
          />
          <select
            className="input"
            style={{ width: "auto", minWidth: 132 }}
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="Sort documents"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 24 }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const ids = visible.map((doc) => doc.id)
              if (allVisibleSelected) deselectMany(ids)
              else selectMany(ids)
            }}
            disabled={visible.length === 0}
          >
            {selectAllLabel}
          </button>
          <button className="btn btn-ghost" onClick={clearSelection} disabled={selected.size === 0}>
            Clear
          </button>
          <span
            className="text-muted"
            style={{ marginLeft: "auto", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
          >
            {selected.size} of {documents.length} selected
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          borderTop: "1px solid var(--color-divider)",
        }}
      >
        {loading &&
          [1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid color-mix(in srgb,var(--color-text) 10%,transparent)",
              }}
              aria-hidden="true"
            >
              <div style={{ height: 13, flex: 1, background: "var(--color-surface-hi)", animation: "pulseRow 1.4s ease-in-out infinite" }} />
              <div style={{ height: 11, width: 62, background: "var(--color-surface-hi)", animation: "pulseRow 1.4s ease-in-out infinite" }} />
              <div style={{ height: 11, width: 84, background: "var(--color-surface-hi)", animation: "pulseRow 1.4s ease-in-out infinite" }} />
            </div>
          ))}

        {failed && (
          <div
            style={{
              padding: "28px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <h4 style={{ margin: 0 }}>Can&rsquo;t load your documents</h4>
            <p className="text-muted" style={{ fontSize: 13, margin: 0, maxWidth: "44ch" }}>
              {error}
            </p>
            <button className="btn btn-secondary" onClick={() => void fetchDocuments()}>
              Try again
            </button>
          </div>
        )}

        {empty && (
          <div
            style={{
              padding: "40px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <EmptyLibraryMark />
            <h3 style={{ margin: 0 }}>No documents yet</h3>
            <p className="text-muted" style={{ fontSize: 14, margin: 0, maxWidth: "42ch" }}>
              Upload a PDF, DOCX or TXT file to start. Answers come only from the documents
              you upload and select.
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: "10px 18px", fontSize: 14 }}
              onClick={onOpenUpload}
            >
              Upload a document
            </button>
          </div>
        )}

        {noMatches && (
          <div
            style={{
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <h4 style={{ margin: 0 }}>No filenames match “{search}”</h4>
            <button className="btn btn-secondary" onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        )}

        {visible.map((document) => {
          const isSelected = selected.has(document.id)
          const isDeleting = deleting.has(document.id)

          return (
            <div
              key={document.id}
              className="doc-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                borderBottom: ROW_BORDER,
                cursor: "pointer",
                background: "transparent",
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => toggle(document.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  toggle(document.id)
                }
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1.5px solid ${
                    isSelected
                      ? "var(--color-accent)"
                      : "color-mix(in srgb,var(--color-text) 45%,transparent)"
                  }`,
                  background: isSelected ? "var(--color-accent)" : "transparent",
                }}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`${isSelected ? "Deselect" : "Select"} ${document.name}`}
              >
                {isSelected && <CheckMark />}
              </span>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <div
                  style={{
                    fontSize: 14,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={document.name}
                >
                  {document.name}
                </div>
                <div
                  className="text-muted"
                  style={{
                    fontSize: 11,
                    letterSpacing: ".04em",
                    fontVariantNumeric: "tabular-nums",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span>{formatSize(document.size)}</span>
                  <span>{formatDate(document.uploadDate)}</span>
                  <span>{kindLabel(document)}</span>
                </div>
              </div>

              {isDeleting && (
                <span
                  className="text-muted"
                  style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}
                >
                  Deleting
                </span>
              )}

              <button
                className="btn btn-icon row-delete"
                style={{
                  borderRadius: "50%",
                  border: "1px solid transparent",
                  color: "color-mix(in srgb,var(--color-text) 55%,transparent)",
                }}
                aria-label={`Delete ${document.name}`}
                disabled={isDeleting}
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestDelete(document)
                }}
              >
                <TrashIcon />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
