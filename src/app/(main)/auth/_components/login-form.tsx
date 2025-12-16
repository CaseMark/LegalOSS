"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

interface DevCredentials {
  isDevMode: boolean;
  credentials: {
    email: string;
    password: string;
  } | null;
}

export function LoginForm() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  // Check for dev mode and pre-fill credentials
  useEffect(() => {
    fetch("/api/auth/dev-credentials")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: DevCredentials | null) => {
        if (data?.isDevMode && data.credentials) {
          setIsDevMode(true);
          form.setValue("email", data.credentials.email);
          form.setValue("password", data.credentials.password);
        }
      })
      .catch(() => {
        // Silently fail - not in dev mode
      });
  }, [form]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      // Use NextAuth signIn
      const { signIn } = await import("next-auth/react");

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Login failed", {
          description: "Invalid email or password",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Login successful", {
        description: "Redirecting to dashboard...",
      });

      // Redirect to dashboard
      window.location.href = "/dashboard/default";
    } catch {
      toast.error("Login failed", {
        description: "An error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isDevMode && (
          <div className="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md border p-3 text-sm">
            <strong>🔧 Dev Mode</strong> — Credentials pre-filled. Just click Login!
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
                  autoComplete="current-password"
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
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                  disabled={isLoading}
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                Remember me for 30 days
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </Form>
  );
}
