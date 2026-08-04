"use client"

import { useEffect, useState } from "react"
import { useClerk, useUser } from "@clerk/nextjs"

import AskPanel from "@/components/ask-panel"
import DeleteDialog from "@/components/delete-dialog"
import { WarningTriangle } from "@/components/icons"
import LibraryPanel from "@/components/library-panel"
import Toaster from "@/components/toaster"
import UploadDialog from "@/components/upload-dialog"
import { pluralize } from "@/lib/format"
import { useChat } from "@/lib/stores/chat"
import { useDocuments, type DocumentRecord } from "@/lib/stores/documents"
import { useHealth } from "@/lib/stores/health"
import { useToasts } from "@/lib/stores/toasts"
import { useUploads } from "@/lib/stores/uploads"

/** Below this the two panes stop fitting side by side and become a choice. */
const NARROW_QUERY = "(max-width: 1023px)"

/** How often to re-probe the document service while it is down. */
const REPROBE_MS = 30_000

export default function Workspace() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const documents = useDocuments((state) => state.documents)
  const selected = useDocuments((state) => state.selected)
  const fetchDocuments = useDocuments((state) => state.fetchDocuments)

  const degraded = useHealth((state) => state.degraded)
  const probing = useHealth((state) => state.probing)
  const probe = useHealth((state) => state.probe)

  const [isNarrow, setIsNarrow] = useState(false)
  const [pane, setPane] = useState<"docs" | "ask">("docs")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null)

  // Starts false so the server render and the first client render agree; the
  // real answer arrives in an effect, which is after hydration either way.
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY)
    const sync = () => setIsNarrow(query.matches)

    sync()
    query.addEventListener("change", sync)

    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    void fetchDocuments()
    void probe()
  }, [fetchDocuments, probe])

  // Only poll while something is wrong. A healthy service is left alone.
  useEffect(() => {
    if (!degraded) return

    const timer = setInterval(() => void probe(), REPROBE_MS)

    return () => clearInterval(timer)
  }, [degraded, probe])

  const scopeLabel =
    selected.size === 0
      ? "Nothing in scope"
      : `${selected.size} ${selected.size === 1 ? "document" : "documents"} in scope`

  const showLibrary = !isNarrow || pane === "docs"
  const showAsk = !isNarrow || pane === "ask"

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0 }}>
        <div className="nav" style={{ flex: "none", gap: 16, padding: "18px 24px" }}>
          <div className="nav-brand" style={{ marginRight: 20 }}>
            DocuChat
          </div>
          <span className="tag tag-neutral" style={{ fontVariantNumeric: "tabular-nums" }}>
            {pluralize(documents.length, "document")}
          </span>
          <span style={{ marginLeft: "auto" }} />
          <span className="text-muted" style={{ fontSize: 13 }}>
            {user?.primaryEmailAddress?.emailAddress ?? ""}
          </span>
          <button
            className="btn btn-secondary"
            style={{ borderRadius: 999, paddingInline: 16 }}
            onClick={() => {
              // Wipe the in-memory stores before Clerk redirects: the next
              // person to sign in on this tab must not see the last one's
              // library or transcript flash up while their own loads.
              useChat.getState().reset()
              useUploads.getState().clear()
              useDocuments.getState().reset()
              useToasts.setState({ toasts: [] })

              void signOut({ redirectUrl: "/login" })
            }}
          >
            Sign out
          </button>
        </div>

        {degraded && (
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              background: "color-mix(in srgb,var(--color-accent) 16%,transparent)",
              borderBottom: "2px solid var(--color-accent)",
            }}
            role="status"
          >
            <WarningTriangle />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--color-accent-300)",
              }}
            >
              Degraded
            </span>
            <span style={{ fontSize: 13 }}>
              The document service isn&rsquo;t responding. Uploads and deletes are unavailable;
              existing answers still work.
            </span>
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={() => void probe()}
              disabled={probing}
            >
              {probing ? "Probing…" : "Retry probe"}
            </button>
          </div>
        )}

        {isNarrow && (
          <div
            style={{
              flex: "none",
              padding: "10px 20px",
              borderBottom: "1px solid var(--color-divider)",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div className="seg">
              <label className="seg-opt">
                <input
                  type="radio"
                  name="pane"
                  checked={pane === "docs"}
                  onChange={() => setPane("docs")}
                />
                Documents
              </label>
              <label className="seg-opt">
                <input
                  type="radio"
                  name="pane"
                  checked={pane === "ask"}
                  onChange={() => setPane("ask")}
                />
                Ask
              </label>
            </div>
            <span
              className="text-muted"
              style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            >
              {scopeLabel}
            </span>
          </div>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "minmax(340px,0.86fr) 1.14fr",
          }}
        >
          {showLibrary && (
            <LibraryPanel
              onOpenUpload={() => {
                useUploads.getState().clear()
                setUploadOpen(true)
              }}
              onRequestDelete={setDeleteTarget}
            />
          )}
          {showAsk && <AskPanel />}
        </div>
      </div>

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}

      {deleteTarget && (
        <DeleteDialog
          document={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const target = deleteTarget
            setDeleteTarget(null)
            void useDocuments.getState().deleteDocument(target)
          }}
        />
      )}

      <Toaster />
    </div>
  )
}
