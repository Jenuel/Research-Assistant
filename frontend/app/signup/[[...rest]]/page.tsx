import { SignUp } from "@clerk/nextjs"

import AuthShell from "@/components/auth-shell"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default function SignupPage() {
  return (
    <AuthShell heading="Create an account">
      <SignUp appearance={clerkAppearance} />
    </AuthShell>
  )
}
