import { SignUp } from "@clerk/nextjs"

import AuthLayout from "@/components/auth-layout"

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-gray-800/50 border border-gray-700 backdrop-blur-sm shadow-xl",
          },
        }}
      />
    </AuthLayout>
  )
}
