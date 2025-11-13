"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(6, { message: "Confirm Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function RegisterForm() {
  const [authStatus, setAuthStatus] = useState<{ isFirstUser: boolean } | null>(null);

  useEffect(() => {
    // Check if this is the first user
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setAuthStatus(data);

        // If users exist and signup disabled, redirect to login
        if (data.hasUsers && !data.signupEnabled) {
          toast.info("Signup is disabled", {
            description: "Please log in or contact an administrator",
          });
          setTimeout(() => {
            window.location.href = "/auth/v1/login";
          }, 2000);
        }
      });
  }, []);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      // Check auth status first
      const statusResponse = await fetch("/api/auth/status");
      const status = await statusResponse.json();

      if (!status.signupEnabled && !status.isFirstUser) {
        toast.error("Registration closed", {
          description: "Signup is disabled. Contact an administrator for an invitation.",
        });
        return;
      }

      // Create account
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

      if (!response.ok) {
        toast.error("Registration failed", {
          description: result.error || "Please try again",
        });
        return;
      }

      toast.success(result.message || "Account created!", {
        description: "Logging you in...",
      });

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
        // Fallback to login page if auto-login fails
        window.location.href = "/auth/v1/login";
      }
    } catch (error) {
      toast.error("Registration failed", {
        description: "An error occurred. Please try again.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...field} />
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
                <Input id="password" type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          Register
        </Button>
      </form>
    </Form>
  );
}
