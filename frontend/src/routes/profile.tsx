import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Leaf } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CanopyEdge } from "@/components/canopy-light";
import { SiteHeader } from "@/components/site-header";
import { SafetyNote } from "@/components/site-footer";
import { plans } from "@/data/mock";
import { authApi, paymentsApi, type AuthUser, type PaymentPlanType } from "@/lib/api";
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

const toPaymentPlanType = (value: string): PaymentPlanType => {
  return PAYMENT_PLAN_IDS.includes(value as PaymentPlanType)
    ? (value as PaymentPlanType)
    : "monthly";
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout script.")), {
          once: true,
        });
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

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile - Beyond Fear" },
      {
        name: "description",
        content: "Manage your account details, check your current plan, and upgrade any time.",
      },
    ],
  }),
  component: ProfilePage,
});

function getPrefilledDisplayName(user: AuthUser | null | undefined) {
  const preferred = user?.displayName?.trim();
  if (preferred) return preferred;

  const legacyUsername = (user as { username?: string } | null)?.username?.trim();
  if (legacyUsername) return legacyUsername;

  const legacyName = (user as { name?: string } | null)?.name?.trim();
  if (legacyName) return legacyName;

  const emailPrefix = user?.email?.split("@")[0]?.trim();
  return emailPrefix || "";
}

function getPrefilledEmail(user: AuthUser | null | undefined) {
  const email = user?.email?.trim();
  if (email) return email;

  const legacyEmail = (user as { emailAddress?: string } | null)?.emailAddress?.trim();
  if (legacyEmail) return legacyEmail;

  return "";
}

function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, token, user, refreshProfile } = useAuth();
  const hydrationAttemptedRef = useRef(false);

  const [displayName, setDisplayName] = useState(getPrefilledDisplayName(user));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [paymentError, setPaymentError] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanType>("monthly");
  const [managePlanOpen, setManagePlanOpen] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState<{
    subscription: AuthUser["subscription"] | null;
    sessions?: {
      used: number;
      total: number;
      remaining: number;
      isUnlimited: boolean;
    };
  } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!token || hydrationAttemptedRef.current) {
      return;
    }

    hydrationAttemptedRef.current = true;
    void refreshProfile().catch(() => {
      // Keep local auth values if backend is temporarily unavailable.
    });
  }, [refreshProfile, token]);

  useEffect(() => {
    setDisplayName(getPrefilledDisplayName(user));
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!token) return;

    paymentsApi
      .status(token)
      .then((result) => {
        setPaymentStatus({
          subscription: result.subscription || null,
          sessions: result.sessions,
        });
      })
      .catch(() => {
        setPaymentStatus(null);
      });
  }, [token, user?.subscription?.status, user?.subscription?.planType]);

  const isPremium = user?.subscription?.status === "premium";
  const prefilledEmail = getPrefilledEmail(user);

  const activePlanName = useMemo(() => {
    const planType = user?.subscription?.planType;
    if (!planType || planType === "free") return "Free";
    return planType.charAt(0).toUpperCase() + planType.slice(1);
  }, [user?.subscription?.planType]);

  const planExpiryLabel = useMemo(() => {
    const expiresAt = user?.subscription?.expiresAt;
    if (!expiresAt) return "";
    const value = new Date(expiresAt);
    if (Number.isNaN(value.getTime())) return "";
    return value.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }, [user?.subscription?.expiresAt]);

  async function handleSaveProfile() {
    if (!token) return;

    const nextDisplayName = displayName.trim();
    const currentDisplayName = getPrefilledDisplayName(user).trim();

    if (nextDisplayName.length < 2) {
      setProfileError("Name should be at least 2 characters.");
      return;
    }

    if (nextDisplayName === currentDisplayName) {
      setProfileMessage("No changes to save.");
      setProfileError("");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      await authApi.updateProfile(token, { displayName: nextDisplayName });
      await refreshProfile();
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function verifyPaymentWithRetry(payload: RazorpaySuccessPayload) {
    if (!token) throw new Error("You need to be logged in to verify payment.");

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

  async function handleStartPayment(planType: PaymentPlanType) {
    if (!token || isStartingPayment) return;

    setSelectedPlan(planType);
    setIsStartingPayment(true);
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
            setManagePlanOpen(false);
            setPaymentError("");
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Payment was received but verification failed. Please contact support if this persists.";
            setPaymentError(message);
          }
        },
      });

      checkout.on("payment.failed", (event) => {
        const reason = event?.error?.description || "Payment failed";
        setPaymentError(reason);

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
    } finally {
      setIsStartingPayment(false);
    }
  }

  if (isLoading || !isAuthenticated) {
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

        <div className="relative mx-auto max-w-6xl space-y-6 px-5 py-14">
          <section className="rounded-4xl border border-border bg-card p-7 shadow-soft sm:p-10">
            <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <div className="eyebrow">Account</div>
                <h1 className="mt-3 font-serif text-4xl text-foreground sm:text-5xl">Your profile</h1>
                <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
                  Edit your details, review your current plan, and manage upgrades from one place.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-foreground">
                      Name
                    </label>
                    <input
                      id="displayName"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-leaf"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <input
                      id="email"
                      value={prefilledEmail}
                      readOnly
                      aria-readonly="true"
                      className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSaveProfile()}
                      disabled={isSavingProfile}
                      className="inline-flex items-center justify-center rounded-full gradient-leaf px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {isSavingProfile ? "Saving..." : "Save changes"}
                    </button>
                    {profileMessage && <span className="text-sm text-leaf">{profileMessage}</span>}
                    {profileError && <span className="text-sm text-destructive">{profileError}</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-secondary/60 p-6">
                <div className="eyebrow">Subscription</div>
                <p className="mt-2 font-serif text-3xl text-foreground">{isPremium ? "Premium" : "Free"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isPremium ? `${activePlanName} plan active` : "Free tier active"}
                </p>
                {isPremium && planExpiryLabel && (
                  <p className="mt-2 text-xs text-muted-foreground">Valid until {planExpiryLabel}</p>
                )}

                <div className="mt-5 space-y-2 rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Sessions</div>
                  <div className="text-sm text-foreground">
                    {paymentStatus?.sessions?.isUnlimited
                      ? "Unlimited sessions available"
                      : `${paymentStatus?.sessions?.remaining ?? 0} remaining of ${paymentStatus?.sessions?.total ?? 1}`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setManagePlanOpen(true)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
                >
                  {isPremium ? "Manage plan" : "Upgrade plan"}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl text-foreground">Plans</h2>
              {!isPremium && (
                <span className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs text-muted-foreground">
                  Upgrade to unlock premium features
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const planType = toPaymentPlanType(plan.id);
                const isCurrent = user?.subscription?.planType === planType && isPremium;

                return (
                  <article
                    key={plan.id}
                    className={`rounded-3xl border p-5 ${plan.featured ? "border-leaf/60 bg-secondary/40" : "border-border bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-xl text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-2xl text-foreground">{plan.price}</p>
                        <p className="text-xs text-muted-foreground">{plan.cadence}</p>
                      </div>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2.5 py-1 text-xs text-leaf">
                          <Check className="size-3.5" aria-hidden />
                          Current
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{plan.note}</p>

                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Leaf className="mt-0.5 size-3.5 shrink-0 text-leaf" aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        void handleStartPayment(planType);
                      }}
                      disabled={isStartingPayment || isCurrent}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full gradient-leaf px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {isCurrent
                        ? "Active plan"
                        : isStartingPayment && selectedPlan === planType
                          ? "Opening checkout..."
                          : "Choose plan"}
                    </button>
                  </article>
                );
              })}
            </div>

            {paymentError && (
              <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {paymentError}
              </p>
            )}
          </section>

          <SafetyNote compact />
        </div>
      </main>

      <Dialog open={managePlanOpen} onOpenChange={setManagePlanOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Plan details</DialogTitle>
            <DialogDescription>
              {isPremium
                ? "Your premium plan is active. You can switch plans by choosing another option below."
                : "Upgrade to unlock unlimited sessions, incognito mode, and full history controls."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {plans.map((plan) => {
              const planType = toPaymentPlanType(plan.id);
              const isCurrent = user?.subscription?.planType === planType && isPremium;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    void handleStartPayment(planType);
                  }}
                  disabled={isStartingPayment || isCurrent}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/60 disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-medium text-foreground">{plan.name}</span>
                    <span className="block text-xs text-muted-foreground">{plan.price} {plan.cadence}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isCurrent
                      ? "Current"
                      : isStartingPayment && selectedPlan === planType
                        ? "Starting..."
                        : "Select"}
                  </span>
                </button>
              );
            })}
          </div>

          {paymentError && (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {paymentError}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
