"use client"

import type React from "react"

/**
 * A deliberately small Markdown renderer: headings, bullets, ordered items and
 * paragraphs, plus inline bold, italic and code. Everything is built as React
 * elements — an answer is model output derived from untrusted document text, so
 * it must never reach dangerouslySetInnerHTML, and no full Markdown library
 * gets to decide what counts as safe HTML on our behalf.
 */

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "ordered"; marker: string; text: string }
  | { kind: "paragraph"; text: string }

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        // Two visual weights are enough; anything deeper than an h3 in a chat
        // answer flattens rather than shrinking indefinitely.
        kind: "heading",
        level: heading[1].length <= 2 ? 2 : 3,
        text: heading[2],
      })
      continue
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      blocks.push({ kind: "bullet", text: bullet[1] })
      continue
    }

    const ordered = /^(\d+)[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      blocks.push({ kind: "ordered", marker: `${ordered[1]}.`, text: ordered[2] })
      continue
    }

    blocks.push({ kind: "paragraph", text: line })
  }

  return blocks
}

/** Splits on **bold**, *italic* and `code`, leaving everything else as text. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

  let cursor = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))

    const token = match[0]
    const key = `${keyPrefix}-${index++}`

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} style={{ fontWeight: 800 }}>
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.92em",
            padding: "1px 5px",
            background: "color-mix(in srgb,var(--color-text) 9%,transparent)",
          }}
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }

    cursor = match.index + token.length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))

  return nodes
}

export default function Answer({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <div style={{ fontSize: 15, lineHeight: 1.68 }}>
      {blocks.map((block, index) => {
        const key = `b${index}`

        if (block.kind === "heading") {
          return (
            <div
              key={key}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: block.level === 2 ? 17 : 15,
                margin: "14px 0 6px",
                lineHeight: 1.2,
              }}
            >
              {renderInline(block.text, key)}
            </div>
          )
        }

        if (block.kind === "bullet") {
          // An em dash rather than a disc: Modernist draws lists with dashes.
          return (
            <div key={key} style={{ margin: "0 0 6px", paddingLeft: 2 }}>
              {"— "}
              {renderInline(block.text, key)}
            </div>
          )
        }

        if (block.kind === "ordered") {
          return (
            <div key={key} style={{ margin: "0 0 6px", paddingLeft: 2 }}>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{block.marker} </span>
              {renderInline(block.text, key)}
            </div>
          )
        }

        return (
          <div key={key} style={{ margin: "0 0 10px" }}>
            {renderInline(block.text, key)}
          </div>
        )
      })}
    </div>
  )
}
