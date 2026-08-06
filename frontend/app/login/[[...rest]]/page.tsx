import { SignIn } from "@clerk/nextjs"

import AuthShell from "@/components/auth-shell"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default function LoginPage() {
  return (
    <AuthShell heading="Sign in">
      <SignIn appearance={clerkAppearance} />
    </AuthShell>
  )
}
