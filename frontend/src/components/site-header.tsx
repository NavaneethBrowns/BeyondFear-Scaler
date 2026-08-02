import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const label =
    user?.displayName ||
    (user as { username?: string } | null)?.username ||
    (user as { name?: string } | null)?.name ||
    user?.email?.split("@")[0] ||
    "Profile";
  const isPremium = user?.subscription?.status === "premium";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:flex sm:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-full">
          <span className="grid size-8 shrink-0 place-items-center rounded-full gradient-leaf">
            <Leaf className="size-4 text-primary-foreground" aria-hidden />
          </span>
          <span className="truncate font-serif text-lg text-foreground">Beyond Fear</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          {!isAuthenticated && (
            <a
              href="/#method"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Method
            </a>
          )}
          {(!isAuthenticated || !isPremium) && (
            <a
              href="/#pricing"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Pricing
            </a>
          )}
          {isLoading ? null : isAuthenticated ? (
            <>
              <Link
                to="/chat"
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                Sessions
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                Progress
              </Link>
              <span className="hidden rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:inline-flex">
                {label}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-full gradient-leaf px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
