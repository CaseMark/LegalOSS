"use client";

import { useEffect, useState, useCallback } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Confirm Password must be at least 8 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

interface AuthStatus {
  hasUsers: boolean;
  signupEnabled: boolean;
  isFirstUser: boolean;
  setupInProgress?: boolean;
  dbReady?: boolean;
}

function isSignupBlocked(status: AuthStatus | null): boolean {
  if (!status) return false;
  return status.hasUsers === true && status.signupEnabled === false && status.isFirstUser === false;
}

export function RegisterForm() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const checkStatus = useCallback(async (attempt = 1): Promise<AuthStatus | null> => {
    try {
      const res = await fetch("/api/auth/status");
      if (!res.ok) throw new Error("Status check failed");

      const data = (await res.json()) as AuthStatus;

      // Validate response has expected fields
      if (typeof data.hasUsers !== "boolean" || typeof data.signupEnabled !== "boolean") {
        throw new Error("Invalid status response");
      }

      return data;
    } catch (err) {
      console.warn(`[RegisterForm] Status check attempt ${attempt} failed:`, err);

      // Retry up to 3 times with exponential backoff
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        return checkStatus(attempt + 1);
      }

      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIsCheckingStatus(true);

      const status = await checkStatus();

      if (!mounted) return;

      if (status) {
        setAuthStatus(status);

        // If setup is in progress elsewhere, poll for completion
        if (status.setupInProgress) {
          toast.info("Setup in progress...", {
            description: "Another setup is completing. Please wait.",
          });
          // Poll every 2 seconds
          setTimeout(init, 2000);
          return;
        }

        // Only redirect if we're CERTAIN users exist and signup is disabled
        if (status.hasUsers === true && status.signupEnabled === false) {
          toast.info("Signup is disabled", {
            description: "Please log in or contact an administrator",
          });
          setTimeout(() => {
            window.location.href = "/auth/v1/login";
          }, 2000);
        }
      } else {
        // On error, assume first-user mode to allow initial admin setup
        console.log("[RegisterForm] Defaulting to first-user mode");
        setAuthStatus({ hasUsers: false, signupEnabled: true, isFirstUser: true });
      }

      setIsCheckingStatus(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [checkStatus, retryCount]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    // Only block if we're CERTAIN signup is disabled for non-first-user
    if (isSignupBlocked(authStatus)) {
      toast.error("Registration closed", {
        description: "Signup is disabled. Contact an administrator for an invitation.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create account - the API will handle first-user detection and validation
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.email.split("@")[0], // Use email prefix as name
        }),
      });

      const result = await response.json();

      // Handle setup in progress (503)
      if (response.status === 503 && result.retryAfter) {
        toast.info("Please wait...", {
          description: "Setup is being finalized. Retrying automatically.",
        });

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, result.retryAfter * 1000));
        setRetryCount((prev) => prev + 1);
        setIsLoading(false);
        return;
      }

      // Handle conflict (409) - admin already exists
      if (response.status === 409) {
        toast.info("Admin already exists", {
          description: "Redirecting to login...",
        });
        setTimeout(() => {
          window.location.href = result.redirectTo || "/auth/v1/login";
        }, 1500);
        return;
      }

      if (!response.ok) {
        toast.error("Registration failed", {
          description: result.error ?? "Please try again",
        });
        setIsLoading(false);
        return;
      }

      toast.success(result.message ?? "Account created!", {
        description: "Logging you in...",
      });

      // Small delay to ensure database has synced
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Auto-login the user
      const { signIn } = await import("next-auth/react");

      const loginResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        // Redirect to dashboard
        window.location.href = "/dashboard/default";
      } else {
        // Retry login once after a short delay
        console.log("[RegisterForm] First login attempt failed, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const retryResult = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (retryResult?.ok) {
          window.location.href = "/dashboard/default";
        } else {
          // Fallback to login page if auto-login fails
          toast.info("Please log in manually", {
            description: "Your account was created successfully.",
          });
          setTimeout(() => {
            window.location.href = "/auth/v1/login";
          }, 1500);
        }
      }
    } catch (error) {
      console.error("[RegisterForm] Unexpected error:", error);
      toast.error("Registration failed", {
        description: "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking status
  if (isCheckingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2">Checking system status...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {authStatus?.isFirstUser && (
          <div className="bg-primary/10 text-primary rounded-md p-3 text-sm">
            <strong>Welcome!</strong> You&apos;re creating the first admin account.
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {authStatus?.isFirstUser ? "Creating Admin..." : "Creating Account..."}
            </>
          ) : authStatus?.isFirstUser ? (
            "Create Admin Account"
          ) : (
            "Register"
          )}
        </Button>
      </form>
    </Form>
  );
}
