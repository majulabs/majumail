"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// SECURITY: Client-side validation (server also validates)
const ALLOWED_EMAILS = ["kueck.marcel@gmail.com", "hello@julien-scholz.dev"];

function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

function LoginContent() {
  const searchParams = useSearchParams();
  const verifyParam = searchParams.get("verify");
  const isVerify = verifyParam?.startsWith("true") || verifyParam === "true";
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // SECURITY: Validate email before sending magic link
    if (!isEmailAllowed(email)) {
      setValidationError("This email is not authorized to access MajuMail.");
      return;
    }

    setValidationError(null);
    setIsLoading(true);
    try {
      await signIn("resend", {
        email,
        callbackUrl: "/inbox",
      });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Check your email
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;ve sent you a magic link to sign in. Click the link in your
              email to continue.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-700"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="h-12 w-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
              M
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to MajuMail
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sign in with your email to continue
            </p>
          </div>

          {/* Error */}
          {(error || validationError) && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Unable to sign in
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {validationError || (error === "AccessDenied"
                    ? "Your email is not authorized to access MajuMail."
                    : "Something went wrong. Please try again.")}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                id="email"
                label="Email address"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValidationError(null);
                }}
                required
              />
            </div>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              <Mail className="h-4 w-4 mr-2" />
              Continue with Email
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Only authorized team members can access MajuMail.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
