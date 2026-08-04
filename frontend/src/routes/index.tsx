import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Compass, Footprints, Lock, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { plans } from "@/data/mock";
import { paymentsApi, type PaymentPlanType } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type RazorpaySuccessPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessPayload) => void | Promise<void>;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (
    event: string,
    handler: (response: { error?: { description?: string }; metadata?: { order_id?: string } }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const PAYMENT_PLAN_IDS: PaymentPlanType[] = ["monthly", "quarterly", "annual"];
const VERIFY_RETRY_DELAYS_MS = [5000, 20000, 60000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toPaymentPlanType = (value: string): PaymentPlanType => {
  return PAYMENT_PLAN_IDS.includes(value as PaymentPlanType)
    ? (value as PaymentPlanType)
    : "monthly";
};

let razorpayScriptPromise: Promise<void> | null = null;
const ensureRazorpaySdk = async () => {
  if (typeof window === "undefined") {
    throw new Error("Razorpay checkout is only available in the browser.");
  }

  if (window.Razorpay) return;

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout script.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout script."));
      document.body.appendChild(script);
    });
  }

  await razorpayScriptPromise;

  if (!window.Razorpay) {
    throw new Error("Razorpay checkout did not initialize correctly.");
  }
};

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
  const { isAuthenticated, token, refreshProfile, user } = useAuth();
  const [activePlan, setActivePlan] = useState<PaymentPlanType | null>(null);
  const [paymentError, setPaymentError] = useState("");

  async function verifyPaymentWithRetry(payload: RazorpaySuccessPayload) {
    if (!token) throw new Error("You need to log in before payment verification.");

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await paymentsApi.verify(token, payload);
        return;
      } catch (error) {
        lastError = error;
        if (attempt === VERIFY_RETRY_DELAYS_MS.length) break;
        const delayMs = VERIFY_RETRY_DELAYS_MS[attempt];
        if (typeof delayMs === "number") {
          await wait(delayMs);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Payment verification failed after multiple attempts.");
  }

  async function handlePlanCheckout(planId: string) {
    if (!token) return;

    const planType = toPaymentPlanType(planId);
    setActivePlan(planType);
    setPaymentError("");

    try {
      const orderResult = await paymentsApi.createOrder(token, planType);
      await ensureRazorpaySdk();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is unavailable.");
      }

      if (!orderResult.keyId) {
        throw new Error("Razorpay key id is missing from backend response.");
      }

      const checkout = new window.Razorpay({
        key: orderResult.keyId,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        name: "Beyond Fear",
        description: `${orderResult.planDetails.name} plan`,
        order_id: orderResult.order.order_id,
        ...(user?.displayName || user?.email
          ? {
              prefill: {
                ...(user?.displayName ? { name: user.displayName } : {}),
                ...(user?.email ? { email: user.email } : {}),
              },
            }
          : {}),
        notes: {
          planType,
        },
        theme: {
          color: "#2E9E5B",
        },
        modal: {
          ondismiss: () => {
            setActivePlan(null);
            if (!token) return;
            void paymentsApi.recordFailure(token, {
              orderId: orderResult.order.order_id,
              reason: "Checkout dismissed by user",
            });
          },
        },
        handler: async (response) => {
          try {
            await verifyPaymentWithRetry(response);
            await refreshProfile();
            setPaymentError("");
          } catch (error) {
            setPaymentError(
              error instanceof Error
                ? error.message
                : "Payment was received but verification failed. Please retry shortly.",
            );
          } finally {
            setActivePlan(null);
          }
        },
      });

      checkout.on("payment.failed", (event) => {
        const reason = event?.error?.description || "Payment failed";
        setPaymentError(reason);
        setActivePlan(null);

        if (!token) return;
        const orderId = event?.metadata?.order_id || orderResult.order.order_id;
        void paymentsApi.recordFailure(token, {
          orderId,
          reason,
        });
      });

      checkout.open();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
      setActivePlan(null);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="landing-hero-gradient" />
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
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2.5 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-leaf" aria-hidden />1 free session, no card
                required
              </span>
            </div>
          </div>

          {/* Product glimpse */}
          <div className="rise mt-20 rounded-3xl border border-border bg-card/92 p-3 shadow-lift">
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
              {isAuthenticated ? (
                <button
                  type="button"
                  disabled={activePlan !== null}
                  onClick={() => void handlePlanCheckout(p.id)}
                  className={
                    p.featured
                      ? "mt-8 flex w-full items-center justify-center rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      : "mt-8 flex w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                  }
                >
                  {activePlan === toPaymentPlanType(p.id)
                    ? "Opening checkout..."
                    : `Choose ${p.name.toLowerCase()}`}
                </button>
              ) : (
                <Link
                  to="/signup"
                  className={
                    p.featured
                      ? "mt-8 flex w-full items-center justify-center rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground"
                      : "mt-8 flex w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  }
                >
                  Choose {p.name.toLowerCase()}
                </Link>
              )}
            </article>
          ))}
        </div>

        {paymentError && (
          <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {paymentError}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
