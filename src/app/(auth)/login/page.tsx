"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "signup") {
        // Create account
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Skip email confirmation for now
            emailRedirectTo: undefined,
          },
        });

        if (error) {
          setError(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Create user profile
          await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email || "",
            full_name: "",
            avatar_url: null,
            onboarding_completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // If email confirmation is required, show message
          if (!data.session) {
            setSuccess(
              "Account created! Check your email to confirm, or sign in directly."
            );
            setMode("signin");
            setIsLoading(false);
            return;
          }

          // Session exists — go to onboarding
          window.location.href = "/onboarding";
          return;
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Check onboarding status
          const { data: profile } = await supabase
            .from("users")
            .select("onboarding_completed_at")
            .eq("id", data.user.id)
            .single();

          if (profile?.onboarding_completed_at) {
            window.location.href = "/";
          } else {
            window.location.href = "/onboarding";
          }
          return;
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Kunfa AI</h1>
          <p className="text-blue-100 font-semibold text-sm">
            Source. Analyze. Invest.
          </p>
          <p className="text-blue-50 text-xs mt-2">
            AI-powered deal flow intelligence for founders and investors
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 border border-green-200">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Tab Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signin"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "signup"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
              {mode === "signup" && (
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-white font-semibold transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "signin" ? (
                <>
                  <LogIn size={18} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
