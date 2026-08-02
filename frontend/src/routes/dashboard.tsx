import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Flame, Sparkle, TrendingDown, Trophy } from "lucide-react";
import { CanopyEdge } from "@/components/canopy-light";
import { SiteHeader } from "@/components/site-header";
import { SafetyNote } from "@/components/site-footer";
import { dashboardApi, type DashboardSummaryResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your progress - Beyond Fear" },
      {
        name: "description",
        content:
          "See how the intensity of your fears has shifted over time, which sessions you've completed, and where your momentum is.",
      },
      { property: "og:title", content: "Your progress - Beyond Fear" },
      {
        property: "og:description",
        content: "Intensity trend, completed sessions and momentum, in one calm view.",
      },
    ],
  }),
  component: Dashboard,
});

function formatRecentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (diffMs < oneDayMs) return "Today";
  if (diffMs < 2 * oneDayMs) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, token } = useAuth();
  const { isPremium } = usePlan();
  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token) {
      return;
    }

    setIsDashboardLoading(true);
    setDashboardError("");

    dashboardApi
      .summary(token)
      .then((result) => setDashboard(result))
      .catch((error) => {
        setDashboardError(error instanceof Error ? error.message : "Unable to load progress.");
      })
      .finally(() => setIsDashboardLoading(false));
  }, [isAuthenticated, isLoading, token]);

  const summary = dashboard?.summary;
  const insights = dashboard?.insights;

  const heroHeadline = useMemo(() => {
    if (!summary) return "Your progress is taking shape.";
    if (summary.direction === "down") return "The fear is getting quieter.";
    if (summary.direction === "up") return "You are noticing what is heavy.";
    return "You are building consistency.";
  }, [summary]);

  const heroBody = useMemo(() => {
    if (!summary) {
      return "Track intensity, session completion, and momentum as you keep taking small steps.";
    }

    const directionText =
      summary.direction === "down"
        ? `down by ${summary.directionDelta.toFixed(1)}`
        : summary.direction === "up"
          ? `up by ${summary.directionDelta.toFixed(1)}`
          : "stable";

    return `Across ${summary.totalSessions} sessions your average intensity is ${summary.averageIntensity.toFixed(1)}, ${directionText} from your starting baseline of ${summary.baselineIntensity.toFixed(1)}.`;
  }, [summary]);

  const kpis = useMemo(
    () => [
      {
        label: "Sessions",
        value: String(summary?.totalSessions ?? 0),
        hint: "Since you started",
      },
      {
        label: "Completed",
        value: String(summary?.completedSessions ?? 0),
        hint: "Reached a next step",
      },
      {
        label: "Completion rate",
        value: `${summary?.completionRate ?? 0}%`,
        hint: "Completion of total sessions",
      },
      {
        label: "Avg intensity",
        value: (summary?.averageIntensity ?? 0).toFixed(1),
        hint: `From baseline ${(summary?.baselineIntensity ?? 0).toFixed(1)}`,
      },
    ],
    [summary],
  );

  const insightCards = useMemo(
    () => [
      {
        icon: TrendingDown,
        label: "Latest score",
        value: `${insights?.latestScore ?? "-"} / 10`,
        note: "Most recently updated session",
      },
      {
        icon: Trophy,
        label: "Best score",
        value: `${insights?.bestScore ?? "-"} / 10`,
        note: insights?.bestScoreTitle || "No completed scores yet",
      },
      {
        icon: Sparkle,
        label: "Momentum",
        value: insights?.momentumLabel || "Starting",
        note: insights?.momentumNote || "No recent sessions yet",
      },
      {
        icon: Flame,
        label: "Streak",
        value: `${insights?.streakWeeks ?? 0} week${(insights?.streakWeeks ?? 0) === 1 ? "" : "s"}`,
        note: "Consecutive active weeks",
      },
    ],
    [insights],
  );

  const lastSessionId = dashboard?.recentSessions?.[0]?.id;

  if (isLoading || !isAuthenticated || isDashboardLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <main className="relative overflow-hidden">
        <CanopyEdge />

        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <section className="rounded-4xl border border-border bg-card p-7 shadow-soft sm:p-10">
            <div className="grid gap-8 md:grid-cols-[1.4fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="eyebrow">Your progress</div>
                <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
                  {heroHeadline}
                </h1>
                <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                  {heroBody}
                </p>
                {dashboardError && (
                  <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {dashboardError}
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-border bg-secondary/60 p-6">
                <div className="eyebrow">Plan</div>
                <p className="mt-2 font-serif text-2xl text-foreground">
                  {isPremium ? "Premium" : "Free"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPremium ? "Premium access active" : "One session, no card on file"}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to="/chat"
                    search={lastSessionId ? { sessionId: lastSessionId } : undefined}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background sm:w-auto"
                  >
                    Continue last session
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  {!isPremium && (
                    <Link
                      to="/"
                      hash="pricing"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-leaf px-4 py-2.5 text-sm font-medium text-primary-foreground sm:w-auto"
                    >
                      See plans
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <div className="text-sm text-muted-foreground">{kpi.label}</div>
                <div className="mt-3 font-serif text-4xl text-foreground">{kpi.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl text-foreground">Intensity over time</h2>
                <span className="text-xs text-muted-foreground">Last 7 sessions</span>
              </div>
              <div className="mt-6 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboard?.intensityTrend ?? []}
                    margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient id="intensityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-leaf)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-leaf)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="session"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--color-border)" }}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        color: "var(--color-foreground)",
                        fontSize: "0.8rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="intensity"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#intensityFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {insightCards.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent">
                    <item.icon className="size-4 text-accent-foreground" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="font-serif text-xl text-foreground">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl text-foreground">Recent sessions</h2>
              <Link to="/chat" className="text-sm text-leaf hover:underline">
                Open workspace
              </Link>
            </div>
            <ul className="mt-6 divide-y divide-border">
              {(dashboard?.recentSessions ?? []).map((session) => (
                <li
                  key={session.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 sm:flex sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{session.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatRecentDate(session.updatedAt)} - {session.messageCount} messages
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {session.intensityStart} - <span className="font-medium text-foreground">{session.intensityNow}</span>
                    </span>
                    <span
                      className={
                        session.status === "completed"
                          ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                          : "rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {session.status === "completed" ? "Completed" : "Active"}
                    </span>
                    <Link
                      to="/chat"
                      search={{ sessionId: session.id }}
                      className="text-sm font-medium text-leaf hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
              {(dashboard?.recentSessions ?? []).length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">No sessions yet. Start your first chat to track progress.</li>
              )}
            </ul>
          </section>

          <div className="mt-10">
            <SafetyNote compact />
          </div>
        </div>
      </main>
    </div>
  );
}
