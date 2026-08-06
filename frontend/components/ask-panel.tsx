"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import Answer from "@/components/answer"
import { WarningTriangle } from "@/components/icons"
import { formatTime } from "@/lib/format"
import { NO_MATCH_ANSWER, useChat } from "@/lib/stores/chat"
import { selectedDocuments, useDocuments } from "@/lib/stores/documents"

/**
 * `retrieve()` in the RAG service queries Chroma with n_results=2 over the
 * whole selection, so scope widens *where* the two passages may come from, not
 * how many arrive. Users otherwise read "more documents selected" as "more
 * evidence used", and then read a thin answer as a bug.
 */
const BREADTH_NOTE =
  "Two passages are retrieved per question, across the whole selection. Selecting more widens the search, not the evidence."

/** How many scope chips show before the rest collapse behind "+N more". */
const CHIP_LIMIT = 5

export default function AskPanel() {
  const documents = useDocuments((state) => state.documents)
  const selected = useDocuments((state) => state.selected)
  const toggle = useDocuments((state) => state.toggle)

  const messages = useChat((state) => state.messages)
  const draft = useChat((state) => state.draft)
  const sending = useChat((state) => state.sending)
  const copied = useChat((state) => state.copied)
  const quota = useChat((state) => state.quota)
  const { setDraft, send, retry, copyAnswer } = useChat.getState()

  const [scopeExpanded, setScopeExpanded] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const scope = useMemo(() => selectedDocuments(documents, selected), [documents, selected])
  const chips = scopeExpanded ? scope : scope.slice(0, CHIP_LIMIT)

  const noScope = scope.length === 0
  const scopeLabel = noScope
    ? "Nothing in scope"
    : `${scope.length} ${scope.length === 1 ? "document" : "documents"} in scope`

  // Only follow the transcript when the reader is already at the bottom —
  // yanking them away from an answer they are part-way through reading is worse
  // than making them press "Jump to latest".
  useEffect(() => {
    if (!atBottom) return

    const element = transcriptRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, atBottom])

  // Nothing here is persisted server-side, so a reload loses the conversation
  // outright. Warn only when there is something to lose.
  useEffect(() => {
    if (messages.length === 0) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()

    window.addEventListener("beforeunload", onBeforeUnload)

    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [messages.length])

  const quotaLow = quota !== null && quota.remaining <= Math.max(1, quota.limit * 0.15)
  const sendDisabled = noScope || !draft.trim() || sending

  return (
    <section style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 24px",
        }}
      >
        <h6 style={{ margin: 0 }}>Ask</h6>
        <span className="text-muted" style={{ fontSize: 12 }}>
          This conversation isn&rsquo;t saved. It ends with this tab.
        </span>
      </div>

      <div
        style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 24 }}
        aria-live="polite"
        ref={transcriptRef}
        onScroll={(event) => {
          const element = event.currentTarget
          const reachedBottom =
            element.scrollHeight - element.scrollTop - element.clientHeight < 40

          if (reachedBottom !== atBottom) setAtBottom(reachedBottom)
        }}
      >
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 26 }}>
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                alignItems: "flex-start",
                paddingTop: 8,
              }}
            >
              <h3 style={{ margin: 0, maxWidth: "20ch" }}>
                Ask a question about what&rsquo;s in scope.
              </h3>
              <p className="text-muted" style={{ fontSize: 14, margin: 0, maxWidth: "46ch" }}>
                Answers are drawn only from the documents you&rsquo;ve selected — not from the
                rest of your library, and not from the model&rsquo;s own knowledge.
              </p>
            </div>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user"
            const isNoMatch = !isUser && message.text.trim() === NO_MATCH_ANSWER
            const hasAnswer = !isUser && !!message.text && !isNoMatch

            return (
              <div
                key={message.id}
                style={
                  isUser
                    ? { paddingLeft: 0 }
                    : {
                        paddingLeft: 0,
                        borderTop: "1px solid color-mix(in srgb,var(--color-text) 9%,transparent)",
                        paddingTop: 18,
                      }
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      flex: "none",
                      background: isUser ? "transparent" : "var(--color-accent)",
                      border: isUser
                        ? "1.5px solid color-mix(in srgb,var(--color-text) 50%,transparent)"
                        : "none",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      color: isUser
                        ? "color-mix(in srgb,var(--color-text) 60%,transparent)"
                        : "var(--color-accent-400)",
                    }}
                  >
                    {isUser ? "You" : "DocuChat"}
                  </span>
                  <span
                    className="text-muted"
                    style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTime(message.at)}
                  </span>
                </div>

                {isUser && (
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{message.text}</p>
                )}

                {message.pending && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      background: "var(--color-surface)",
                      borderLeft: "2px solid var(--color-accent)",
                      width: "fit-content",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        animation: "pulseRow 1s ease-in-out infinite",
                      }}
                    />
                    <span className="text-muted" style={{ fontSize: 13 }}>
                      Reading your documents…
                    </span>
                  </div>
                )}

                {hasAnswer && <Answer text={message.text} />}

                {isNoMatch && (
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "var(--color-surface)",
                      borderLeft: "2px solid var(--color-divider)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontSize: 14 }}>
                      Nothing in the selected documents matched that question.
                    </div>
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      Try rephrasing, or put more documents in scope.
                    </div>
                  </div>
                )}

                {message.failure && (
                  <div
                    style={{
                      padding: "14px 16px",
                      background: "color-mix(in srgb,var(--color-accent) 12%,transparent)",
                      borderLeft: "2px solid var(--color-accent)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <WarningTriangle />
                      <div style={{ fontSize: 14 }}>{message.failure.message}</div>
                    </div>
                    {message.failure.retryable && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => retry(message.id)}
                        disabled={sending}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {hasAnswer && (
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: 10 }}
                    onClick={() => copyAnswer(message)}
                  >
                    {copied === message.id ? "Copied" : "Copy answer"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!atBottom && messages.length > 0 && (
        <div style={{ flex: "none", padding: "0 24px" }}>
          <button
            className="btn btn-secondary"
            style={{ margin: "-16px 0 8px" }}
            onClick={() => {
              setAtBottom(true)

              const element = transcriptRef.current
              if (element) element.scrollTop = element.scrollHeight
            }}
          >
            Jump to latest
          </button>
        </div>
      )}

      <div
        style={{
          flex: "none",
          borderTop: "1px solid var(--color-divider)",
          background: "var(--color-surface)",
        }}
      >
        <div
          style={{
            padding: "12px 24px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--color-accent-400)",
              }}
            >
              In scope
            </span>
            <span
              className="text-muted"
              style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
            >
              {scopeLabel}
            </span>
          </div>

          {!noScope && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chips.map((document) => (
                <span
                  key={document.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    maxWidth: 260,
                    padding: "5px 14px 5px 8px",
                    background: "color-mix(in srgb,var(--color-accent) 14%,transparent)",
                    borderLeft: "2px solid var(--color-accent)",
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%)",
                    fontSize: 12,
                    animation: "chipIn 140ms ease-out",
                  }}
                >
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {document.name}
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "0 2px", fontSize: 12 }}
                    aria-label={`Remove ${document.name} from scope`}
                    onClick={() => toggle(document.id)}
                  >
                    ×
                  </button>
                </span>
              ))}

              {scope.length > CHIP_LIMIT && (
                <button className="btn btn-ghost" onClick={() => setScopeExpanded(!scopeExpanded)}>
                  {scopeExpanded ? "Show fewer" : `+${scope.length - CHIP_LIMIT} more`}
                </button>
              )}
            </div>
          )}

          {noScope && (
            <div className="text-muted" style={{ fontSize: 13 }}>
              Nothing selected. Select at least one document to ask about.
            </div>
          )}

          <div className="text-muted" style={{ fontSize: 11 }}>
            {BREADTH_NOTE}
          </div>
        </div>

        {quotaLow && quota && (
          <div
            style={{
              padding: "8px 24px",
              fontSize: 12,
              borderTop: "1px solid var(--color-divider)",
              color: "var(--color-accent-300)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {quota.remaining} of {quota.limit} questions left in this window.
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "4px 24px 18px" }}>
          <textarea
            className="input"
            style={{
              flex: 1,
              minHeight: 56,
              maxHeight: 160,
              fontSize: 15,
              padding: "12px 14px",
              borderRadius: 14,
            }}
            placeholder={
              noScope
                ? "Select at least one document to ask about."
                : "Ask a question about the documents in scope…"
            }
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                send()
              }
            }}
            disabled={noScope}
            aria-label="Your question"
          />
          <button
            className="btn btn-primary"
            style={{ padding: "12px 28px", fontSize: 14, borderRadius: 999, justifyContent: "center" }}
            disabled={sendDisabled}
            onClick={send}
          >
            Ask
          </button>
        </div>
      </div>
    </section>
  )
}
