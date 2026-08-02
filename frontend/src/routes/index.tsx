import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Compass, Footprints, Lock, ShieldCheck } from "lucide-react";
import { CanopyLight } from "@/components/canopy-light";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { plans } from "@/data/mock";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beyond Fear — move through fear, one conversation at a time" },
      {
        name: "description",
        content:
          "Name the fear, find the conflict underneath it, and leave with one practical next step. One free session, no card required. Plans from ₹199.",
      },
      { property: "og:title", content: "Beyond Fear — move through fear, one conversation at a time" },
      {
        property: "og:description",
        content:
          "Name the fear, find the conflict underneath it, and leave with one practical next step. One free session, no card required. Plans from ₹199.",
      },
    ],
  }),
  component: Landing,
});

const capabilities = [
  {
    icon: Compass,
    title: "Clear fear mapping",
    body: "Put the vague, circling worry into plain words. Once it has a shape and a name, it stops running the room.",
  },
  {
    icon: Footprints,
    title: "Actionable insight",
    body: "Every session ends with something you can actually do — small enough to start today, real enough to move you.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Your reflections are yours. Incognito sessions leave no trace in your history, and nothing here is for an audience.",
  },
];

const steps = [
  {
    n: "01",
    title: "Name the fear",
    body: "Say it once, without softening it. Most fears shrink the moment they're written down in one honest sentence.",
  },
  {
    n: "02",
    title: "Find the conflict",
    body: "Underneath almost every stuck feeling are two things you care about pulling in opposite directions. We look for those.",
  },
  {
    n: "03",
    title: "Take one next step",
    body: "Not a plan, not a transformation. One specific action that makes tomorrow slightly less uncertain than today.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <CanopyLight />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pt-28">
          <div className="max-w-3xl">
            <div className="eyebrow rise">A reflection space, not a therapy app</div>
            <h1 className="rise mt-5 text-balance font-serif text-[2.6rem] leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
              Move through fear, one honest conversation at a time.
            </h1>
            <p className="rise mt-7 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
              Beyond Fear helps you name what you're avoiding, understand the conflict underneath it,
              and walk away with one next step instead of another loop of overthinking.
            </p>

            <div className="rise mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                to={isAuthenticated ? "/chat" : "/signup"}
                className="inline-flex items-center gap-2 rounded-full gradient-leaf px-6 py-3.5 text-base font-medium text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
              >
                Start your free session
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2.5 text-sm text-muted-foreground backdrop-blur">
                <ShieldCheck className="size-4 text-leaf" aria-hidden />1 free session, no card
                required
              </span>
            </div>
          </div>

          {/* Product glimpse */}
          <div className="rise mt-20 rounded-3xl border border-border bg-card/80 p-3 shadow-lift backdrop-blur">
            <div className="rounded-2xl bg-background/70 p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-[1.3fr_1fr]">
                <div className="space-y-4">
                  <div className="max-w-[46ch] rounded-2xl rounded-tl-sm bg-secondary px-5 py-4 text-sm leading-relaxed text-secondary-foreground">
                    What is the fear, in one sentence, without softening it?
                  </div>
                  <div className="ml-auto max-w-[42ch] rounded-2xl rounded-tr-sm bg-primary px-5 py-4 text-sm leading-relaxed text-primary-foreground">
                    If I ask for a raise, she'll think I'm ungrateful.
                  </div>
                  <div className="max-w-[48ch] rounded-2xl rounded-tl-sm bg-secondary px-5 py-4 text-sm leading-relaxed text-secondary-foreground">
                    Two things are stacked there: the ask, and the story about what the ask says
                    about you. Which one is actually stopping you?
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="eyebrow">Your next step</div>
                  <p className="mt-3 font-serif text-lg leading-snug text-foreground">
                    Write the first two sentences only.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Don't send anything tonight. Just draft the opening.
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>Intensity</span>
                    <span className="font-medium text-foreground">8 → 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {capabilities.map((c) => (
            <article
              key={c.title}
              className="rounded-3xl border border-border bg-card p-7 shadow-soft transition-transform hover:-translate-y-1"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-accent">
                <c.icon className="size-5 text-accent-foreground" aria-hidden />
              </span>
              <h2 className="mt-6 font-serif text-2xl text-foreground">{c.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Method */}
      <section id="method" className="border-y border-border/70 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <div className="eyebrow">The method</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Three moves, every session.
            </h2>
            <p className="mt-4 max-w-[54ch] text-base leading-relaxed text-muted-foreground">
              The same simple sequence each time, so it becomes something you can do on your own —
              eventually without us.
            </p>
          </div>

          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="border-t border-border pt-6">
                <div className="font-serif text-3xl text-leaf">{s.n}</div>
                <h3 className="mt-4 font-serif text-2xl text-foreground">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-4xl border border-border bg-card p-8 shadow-soft sm:p-14">
          <div
            aria-hidden
            className="canopy-a pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-[90px]"
            style={{ background: "radial-gradient(circle, oklch(0.75 0.13 155 / 0.35), transparent 70%)" }}
          />
          <div className="relative max-w-[58ch]">
            <div className="eyebrow">Our position</div>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Designed so you can leave stronger.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              We don't want to be a habit. There is no streak to protect, no notification asking how
              you're feeling, no feed to scroll. If you stop needing Beyond Fear because you've
              learned to do this on your own, that's the whole point.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Awareness is easy to collect. Action is what actually changes anything.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="max-w-2xl">
          <div className="eyebrow">Pricing</div>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Start free. Upgrade only if it's working.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Your first session is free and needs no card. Premium unlocks unlimited sessions,
            incognito chat and your full history.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.id}
              className={
                p.featured
                  ? "relative rounded-3xl border-2 border-primary bg-card p-8 shadow-lift"
                  : "rounded-3xl border border-border bg-card p-8 shadow-soft"
              }
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most chosen
                </span>
              )}
              <div className="eyebrow">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif text-4xl text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.note}</p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={isAuthenticated ? "/chat" : "/signup"}
                className={
                  p.featured
                    ? "mt-8 flex w-full items-center justify-center rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground"
                    : "mt-8 flex w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                }
              >
                Choose {p.name.toLowerCase()}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
