"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"

import { BrandMark } from "@/components/icons"

export default function HomePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) return

    router.replace(isSignedIn ? "/dashboard" : "/login")
  }, [isLoaded, isSignedIn, router])

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 18,
        padding: "56px 64px",
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <BrandMark />
      <h2 style={{ margin: 0 }}>DocuChat</h2>
      <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
        Checking your session…
      </p>
    </div>
  )
}
