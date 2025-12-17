import Link from "next/link";

import { Landmark } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../../_components/login-form";

export default function LoginV1() {
  return (
    <div className="flex h-dvh">
      <div className="relative hidden overflow-hidden lg:block lg:w-1/3">
        {/* Background Image - height-fixed to always show the memorial */}
        <div
          className="absolute inset-0 bg-bottom bg-no-repeat"
          style={{
            backgroundImage: "url('/images/lincoln-memorial-night.jpg')",
            backgroundSize: "auto 100%",
          }}
        />
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Landmark className="mx-auto size-12 text-white" />
            <div className="space-y-2">
              <h1 className="font-[family-name:var(--font-instrument-serif)] text-6xl font-normal text-white italic">
                {APP_CONFIG.name}
              </h1>
              <p className="text-xl text-white/80">Welcome Back</p>
              <p className="text-sm text-white/70">Access your Legal AI workspace</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Login</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Sign in to access your legal documents, AI chat, and case management tools.
            </div>
          </div>
          <div className="space-y-4">
            <LoginForm />
            <p className="text-muted-foreground text-center text-xs">
              Don&apos;t have an account?{" "}
              <Link href="register" className="text-primary">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
