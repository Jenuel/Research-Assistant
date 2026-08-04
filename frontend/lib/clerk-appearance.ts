import type { SignIn } from "@clerk/nextjs"
import type React from "react"

// Derived from the component that consumes it rather than imported from
// `@clerk/types`, which is a peer `@clerk/nextjs` does not install.
type Appearance = NonNullable<React.ComponentProps<typeof SignIn>["appearance"]>

/**
 * The variable names are Clerk v7's (`colorForeground`, `colorInput`, …), not
 * the v6 spellings (`colorText`, `colorInputBackground`) — the older names are
 * silently ignored rather than rejected at runtime.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#ec3013",
    colorPrimaryForeground: "#17100e",
    colorBackground: "#232120",
    colorForeground: "#f2efeb",
    // Clerk derives borders, muted fills and shimmer from this, so on a dark
    // ground it has to be the ink, not the background.
    colorNeutral: "#f2efeb",
    colorMutedForeground: "#9b9797",
    colorInput: "#2c2a27",
    colorInputForeground: "#f2efeb",
    colorBorder: "#3a3735",
    colorDanger: "#ff563c",
    borderRadius: "0px",
    fontFamily: "var(--font-archivo), system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { boxShadow: "none", border: "none", width: "100%" },
    card: { background: "transparent", boxShadow: "none", padding: 0 },
    // AuthShell already prints the heading in the system's type scale.
    header: { display: "none" },
    footer: { background: "transparent" },
    formButtonPrimary: {
      borderRadius: "999px",
      background: "var(--color-accent)",
      color: "#17100e",
      fontFamily: "var(--font-archivo), system-ui, sans-serif",
      fontWeight: 800,
      fontSize: "14px",
      textTransform: "none",
      "&:hover": { background: "var(--color-accent-400)" },
      "&:active": { background: "var(--color-accent-500)" },
    },
    formFieldInput: { borderRadius: "12px", padding: "13px 16px", fontSize: "15px" },
    socialButtonsBlockButton: { borderRadius: "999px" },
  },
}
