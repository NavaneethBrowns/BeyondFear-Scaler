import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CanopyLight } from "@/components/canopy-light";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await signup(email, password);
      await navigate({ to: "/dashboard" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="relative overflow-hidden">
        <CanopyLight intensity="soft" />
        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden />
              Back home
            </Link>
          </div>

          <section className="mx-auto max-w-lg rounded-4xl border border-border bg-card p-8 shadow-soft sm:p-10">
            <div className="eyebrow">Start simply</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground">Create your account.</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              One free session, no card required. Private by default. Upgrade only if the work feels useful.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm text-foreground">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </label>

              <label className="block text-sm text-foreground">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </label>

              <label className="block text-sm text-foreground">
                <span className="mb-2 block text-sm font-medium">Confirm password</span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-leaf hover:underline">
                Log in
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
