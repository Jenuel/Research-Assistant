import type React from "react"

import { BrandMark } from "@/components/icons"

export default function AuthShell({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 80,
        maxWidth: 1360,
        width: "100%",
        margin: "0 auto",
        padding: "56px 64px",
        alignItems: "center",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
      className="auth-grid"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34,
          justifySelf: "end",
          maxWidth: 540,
        }}
        className="auth-hero"
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: "-0.01em",
          }}
        >
          DocuChat
        </div>
        <div style={{ maxWidth: 460 }}>
          <BrandMark />
          <h1 style={{ fontSize: 52, lineHeight: 1.02, margin: "0 0 20px" }}>
            Answers from the documents you choose.
          </h1>
          <p className="text-muted" style={{ fontSize: 15, maxWidth: "38ch" }}>
            Upload your files, put the ones that matter in scope, and ask. Nothing outside
            that scope is used.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          width: "100%",
          maxWidth: 420,
        }}
      >
        <h2 style={{ fontSize: 34, margin: 0 }}>{heading}</h2>
        <hr className="hr" style={{ margin: 0 }} />
        {children}
      </div>
    </div>
  )
}
