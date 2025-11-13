import Link from "next/link";

import { Landmark } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { RegisterForm } from "../../_components/register-form";

export default function RegisterV1() {
  return (
    <div className="flex h-dvh">
      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Create Admin Account</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Set up the first user account. You will automatically become the administrator.
            </div>
          </div>
          <div className="space-y-4">
            <RegisterForm />
            <p className="text-muted-foreground text-center text-xs">
              Already have an account?{" "}
              <Link href="login" className="text-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Landmark className="text-primary-foreground mx-auto size-12" />
            <div className="space-y-2">
              <h1 className="text-primary-foreground text-6xl font-medium">{APP_CONFIG.name}</h1>
              <p className="text-primary-foreground/80 text-xl">Welcome!</p>
              <p className="text-primary-foreground/70 text-sm">Start your Legal AI journey</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
