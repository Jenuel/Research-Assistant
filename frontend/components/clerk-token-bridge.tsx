"use client"

import { useEffect } from "react"
import { useAuth } from "@clerk/nextjs"

import { registerTokenGetter } from "@/lib/api"

export default function ClerkTokenBridge() {
  const { getToken } = useAuth()

  useEffect(() => {
    registerTokenGetter(() => getToken())

    return () => registerTokenGetter(null)
  }, [getToken])

  return null
}
