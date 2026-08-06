import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  EyeOff,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  SendHorizonal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { SafetyNote } from "@/components/site-footer";
import { CanopyEdge } from "@/components/canopy-light";
import {
  actionLogsApi,
  messagesApi,
  paymentsApi,
  sessionsApi,
  type ActionLog,
  type PaymentPlanType,
  type SessionMessage,
  type SessionRecord,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import { plans } from "@/data/mock";

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
  on: (event: string, handler: (response: { error?: { description?: string }; metadata?: { order_id?: string } }) => void) => void;
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

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search["sessionId"] === "string" ? search["sessionId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your session - Beyond Fear" },
      {
        name: "description",
        content:
          "A quiet workspace to talk through one fear at a time and leave with a single, concrete next step.",
      },
      { property: "og:title", content: "Your session - Beyond Fear" },
      {
        property: "og:description",
        content: "Name the fear, find the conflict, take one next step.",
      },
    ],
  }),
  component: ChatWorkspace,
});

function formatSessionDate(value?: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatMessageTime(value?: string) {
  if (!value) return "Now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatWorkspace() {
  const navigate = useNavigate();
  const { sessionId } = Route.useSearch();
  const { isAuthenticated, isLoading, token, refreshProfile, user } = useAuth();
  const { isPremium } = usePlan();
  const starterSessionRequestRef = useRef<Promise<SessionRecord[]> | null>(null);

  const [sessionList, setSessionList] = useState<SessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("Unlimited sessions");
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanType>(() => {
    const featuredPlan = plans.find((plan) => plan.featured);
    return toPaymentPlanType(featuredPlan?.id || plans[0]?.id || "monthly");
  });
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<SessionRecord | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  function requirePremium(reason: string) {
    setPaywallReason(reason);
    setPaymentError("");
    setPaywallOpen(true);
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

  async function handleStartPayment() {
    if (!token || isStartingPayment) return;

    setIsStartingPayment(true);
    setPaymentError("");

    try {
      const orderResult = await paymentsApi.createOrder(token, selectedPlan);
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
          planType: selectedPlan,
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
            await loadSessions(activeSession?._id);
            setPaywallOpen(false);
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

  async function ensureStarterSession(currentSessions: SessionRecord[]) {
    if (!token) return currentSessions;
    if (currentSessions.length > 0) return currentSessions;

    if (starterSessionRequestRef.current) {
      return starterSessionRequestRef.current;
    }

    const starterRequest = (async () => {
      try {
        const created = await sessionsApi.create(token, {
          title: "My first fear session",
        });

        return [created.session];
      } catch (error) {
        // If another in-flight call created the free session first, use the latest list.
        const listed = await sessionsApi.list(token);
        const withoutDeleted = listed.sessions.filter((s) => s.status !== "deleted");
        if (withoutDeleted.length > 0) {
          return withoutDeleted;
        }
        throw error;
      } finally {
        starterSessionRequestRef.current = null;
      }
    })();

    starterSessionRequestRef.current = starterRequest;
    return starterRequest;
  }

  async function loadSessions(selectSessionId?: string) {
    if (!token) return;

    setSessionsLoading(true);
    setWorkspaceError("");

    try {
      const listed = await sessionsApi.list(token);
      const withoutDeleted = listed.sessions.filter((s) => s.status !== "deleted");
      const hydrated = await ensureStarterSession(withoutDeleted);
      setSessionList(hydrated);

      const targetSessionId =
        selectSessionId ||
        activeSession?._id ||
        hydrated[0]?._id;

      if (targetSessionId) {
        await loadWorkspace(targetSessionId, hydrated);
      } else {
        setActiveSession(null);
        setActionLogs([]);
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to load sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadWorkspace(sessionId: string, sessionsSeed?: SessionRecord[]) {
    if (!token) return;

    setWorkspaceLoading(true);
    setWorkspaceError("");

    try {
      const [sessionResult, actionLogResult] = await Promise.all([
        sessionsApi.get(token, sessionId),
        actionLogsApi.list(token, sessionId),
      ]);

      const session = sessionResult.session;
      setActiveSession(session);
      setActionLogs(actionLogResult.actionLogs);

      if (sessionsSeed) {
        setSessionList(sessionsSeed);
      } else {
        setSessionList((previous) => {
          const next = [...previous];
          const index = next.findIndex((item) => item._id === session._id);
          if (index >= 0) {
            next[index] = { ...next[index], ...session };
          } else {
            next.unshift(session);
          }
          return next;
        });
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to load workspace.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated && token) {
      void loadSessions(sessionId);
    }
  }, [isAuthenticated, isLoading, token, sessionId]);

  const orderedSessions = useMemo(
    () => [...sessionList].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [sessionList],
  );

  const nextStepItems = useMemo(
    () => [...actionLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [actionLogs],
  );

  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);

  const allStepsCompleted =
    nextStepItems.length > 0 &&
    nextStepItems.every((item) => item.status === "completed");

  useEffect(() => {
    if (allStepsCompleted && activeSession?.status === "active") {
      setClosePromptOpen(true);
    }
  }, [allStepsCompleted, activeSession?.status]);

  async function handleCreateSession() {
    if (!token) return;

    if (!isPremium) {
      requirePremium("Unlimited sessions");
      return;
    }

    try {
      const created = await sessionsApi.create(token, {
        title: "New Session",
      });

      await loadSessions(created.session._id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to create session.");
    }
  }

  async function handleRenameSessionAction(session: SessionRecord) {
    if (!token) return;

    if (!isPremium) {
      requirePremium("Renaming sessions");
      return;
    }

    const currentTitle = session.title || session.fearTitle || "Untitled Session";
    setRenamingSessionId(session._id);
    setRenameDraft(currentTitle);
  }

  async function handleSubmitRenameSessionAction(session: SessionRecord) {
    if (!token) return;

    const nextTitle = renameDraft.trim();
    const currentTitle = (session.title || session.fearTitle || "Untitled Session").trim();

    if (!nextTitle || nextTitle === currentTitle) {
      setRenamingSessionId(null);
      setRenameDraft("");
      return;
    }

    try {
      const updated = await sessionsApi.update(token, session._id, {
        title: nextTitle,
      });

      setSessionList((previous) =>
        previous.map((item) =>
          item._id === updated.session._id ? { ...item, ...updated.session } : item,
        ),
      );

      if (activeSession?._id === updated.session._id) {
        setActiveSession((prev) => (prev ? { ...prev, ...updated.session } : prev));
      }
      setRenamingSessionId(null);
      setRenameDraft("");
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to rename session.");
    }
  }

  async function handleDeleteSessionAction(session: SessionRecord) {
    if (!token) return;

    if (!isPremium) {
      requirePremium("Deleting sessions");
      return;
    }

    setPendingDeleteSession(session);
    setConfirmDeleteOpen(true);
  }

  async function handleConfirmDeleteSessionAction() {
    if (!token || !pendingDeleteSession) return;

    setIsDeletingSession(true);

    try {
      await sessionsApi.delete(token, pendingDeleteSession._id);

      const remaining = orderedSessions.filter((item) => item._id !== pendingDeleteSession._id);
      const nextActiveId =
        activeSession?._id === pendingDeleteSession._id ? remaining[0]?._id : activeSession?._id;

      await loadSessions(nextActiveId);
      setConfirmDeleteOpen(false);
      setPendingDeleteSession(null);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to delete session.");
    } finally {
      setIsDeletingSession(false);
    }
  }

  async function handleMakeIncognitoSessionAction(session: SessionRecord) {
    if (!token) return;

    if (!isPremium) {
      requirePremium("Incognito sessions");
      return;
    }

    try {
      const nextTags = Array.from(new Set([...(session.tags ?? []), "incognito"]));

      const updated = await sessionsApi.update(token, session._id, {
        tags: nextTags,
      });

      setSessionList((previous) =>
        previous.map((item) =>
          item._id === updated.session._id ? { ...item, ...updated.session } : item,
        ),
      );

      if (activeSession?._id === updated.session._id) {
        setActiveSession((prev) => (prev ? { ...prev, ...updated.session } : prev));
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to make session incognito.");
    }
  }

  async function handleSendMessage() {
    if (!token || !activeSession || !draft.trim() || isSending) return;

    const outbound = draft.trim();
    const activeSessionId = activeSession._id;
    const optimisticTimestamp = new Date().toISOString();
    const optimisticMessage: SessionMessage = {
      role: "user",
      content: outbound,
      timestamp: optimisticTimestamp,
    };

    setDraft("");
    setIsSending(true);
    setWorkspaceError("");

    setActiveSession((previous) => {
      if (!previous || previous._id !== activeSessionId) return previous;
      return {
        ...previous,
        updatedAt: optimisticTimestamp,
        messages: [...(previous.messages ?? []), optimisticMessage],
      };
    });

    setSessionList((previous) =>
      previous.map((item) =>
        item._id === activeSessionId
          ? { ...item, updatedAt: optimisticTimestamp }
          : item,
      ),
    );

    try {
      const currentIntensity =
        activeSession.fearIntensity?.finalScore ??
        activeSession.fearIntensity?.initialScore;
      const payload: { sessionId: string; message: string; currentIntensity?: number } = {
        sessionId: activeSessionId,
        message: outbound,
      };
      if (typeof currentIntensity === "number") {
        payload.currentIntensity = currentIntensity;
      }

      await messagesApi.send(token, payload);

      await loadWorkspace(activeSessionId);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to send message.");
      setDraft(outbound);
      setActiveSession((previous) => {
        if (!previous || previous._id !== activeSessionId) return previous;

        const previousMessages = previous.messages ?? [];
        const rollbackMessages = previousMessages.filter((message, index) => {
          const isOptimisticCopy =
            index === previousMessages.length - 1 &&
            message.role === "user" &&
            message.content === outbound &&
            message.timestamp === optimisticTimestamp;
          return !isOptimisticCopy;
        });

        return {
          ...previous,
          messages: rollbackMessages,
        };
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleAction(action: ActionLog) {
    if (!token || !activeSession) return;

    try {
      if (action.status === "completed") {
        return;
      }

      const responseText = window.prompt(
        `Share what you tried for "${action.title}" (1-2 sentences). AI will validate before marking complete.`,
      );

      if (!responseText || !responseText.trim()) {
        setWorkspaceError("Add a short response so AI can validate this step.");
        return;
      }

      const result = await actionLogsApi.validateCompletion(
        token,
        activeSession._id,
        action._id,
        responseText.trim(),
      );

      setActionLogs((previous) =>
        previous.map((item) => (item._id === result.actionLog._id ? result.actionLog : item)),
      );

      if (!result.validation.isValid) {
        setWorkspaceError(result.validation.feedback);
      } else {
        setWorkspaceError("");
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to validate next step.");
    }
  }

  async function handleCompleteSession() {
    if (!token || !activeSession) return;

    setIsCompletingSession(true);
    setWorkspaceError("");

    try {
      const latestIntensity =
        activeSession.fearIntensity?.finalScore ??
        activeSession.fearIntensity?.initialScore;
      await sessionsApi.complete(token, activeSession._id, latestIntensity);
      setClosePromptOpen(false);
      await loadSessions(activeSession._id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to complete session.");
    } finally {
      setIsCompletingSession(false);
    }
  }

  const activeTitle = activeSession?.title || activeSession?.fearTitle || "Session";
  const startedAtIntensity = activeSession?.fearIntensity?.initialScore;

  if (isLoading || !isAuthenticated || sessionsLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <main className="relative overflow-hidden lg:h-[calc(100dvh-4.5rem)]">
        <CanopyEdge />
        <div className="relative mx-auto grid h-full max-w-[1600px] gap-6 px-5 py-8 lg:grid-cols-[20fr_80fr]">
          <aside className="rounded-3xl border border-border bg-card p-4 shadow-soft lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <div className="flex items-center justify-between gap-2 px-2 pb-3">
              <span className="eyebrow">Sessions</span>
              <button
                type="button"
                onClick={() => void handleCreateSession()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {isPremium ? <Plus className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                New
              </button>
            </div>

            <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              <ul className="space-y-1">
                {orderedSessions.map((session, index) => {
                  const isActive = session._id === activeSession?._id;
                  const isRenaming = renamingSessionId === session._id;
                  const isIncognito = (session.tags ?? []).includes("incognito");
                  const locked = !isPremium && index > 0;
                  return (
                    <li
                      key={session._id}
                      className={`group flex items-center gap-1 rounded-2xl px-2 py-1.5 transition-colors ${
                        isActive ? "bg-secondary" : "hover:bg-secondary/60"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isRenaming}
                        onClick={() =>
                          locked
                            ? requirePremium("Your full session history")
                            : void loadWorkspace(session._id)
                        }
                        className="min-w-0 flex-1 rounded-xl px-1 py-1.5 text-left"
                      >
                        <span className="flex items-center gap-1.5">
                          {locked && <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
                          <span
                            className={`truncate text-sm ${
                              isActive ? "font-medium text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {isRenaming ? (
                              <input
                                value={renameDraft}
                                autoFocus
                                onChange={(event) => setRenameDraft(event.target.value)}
                                onBlur={() => {
                                  void handleSubmitRenameSessionAction(session);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    void handleSubmitRenameSessionAction(session);
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setRenamingSessionId(null);
                                    setRenameDraft("");
                                  }
                                }}
                                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none ring-0 focus:border-leaf"
                              />
                            ) : (
                              <span className="inline-flex max-w-full items-center gap-1.5">
                                <span className="truncate">{session.title || session.fearTitle || "Untitled Session"}</span>
                                {isIncognito && <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-label="Incognito session" />}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {formatSessionDate(session.updatedAt)}
                        </span>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${session.title || "session"}`}
                          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!isRenaming) {
                                void handleRenameSessionAction(session);
                              }
                            }}
                          >
                            {isPremium ? <Pencil className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!isRenaming) {
                                void handleMakeIncognitoSessionAction(session);
                              }
                            }}
                          >
                            {isPremium ? <EyeOff className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                            Make incognito
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={isPremium ? "text-destructive focus:text-destructive" : undefined}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (!isRenaming) {
                                void handleDeleteSessionAction(session);
                              }
                            }}
                          >
                            {isPremium ? <Trash2 className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </div>

            {!isPremium && (
              <div className="mt-4 rounded-2xl border border-border bg-secondary/60 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You are on the free plan: one live conversation is open, and new sessions are locked.
                </p>
                <button
                  type="button"
                  onClick={() => requirePremium("Unlimited sessions")}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full gradient-leaf px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  See plans
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </div>
            )}
          </aside>

          <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[3fr_1fr]">
            <section className="flex h-full min-h-0 flex-col rounded-3xl border border-border bg-card shadow-soft">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-6 py-4 sm:flex sm:justify-between">
                <div className="min-w-0">
                  <h1 className="truncate font-serif text-xl text-foreground">{activeTitle}</h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {messages.length} messages
                    {typeof startedAtIntensity === "number"
                      ? ` - started at intensity ${startedAtIntensity}`
                      : " - intensity check-in happens in chat"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  {activeSession?.status === "completed" ? "Completed" : "In progress"}
                </span>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    Start by naming the fear in one plain sentence. We will build next steps once the pattern gets clear.
                  </div>
                )}

                {messages.map((message: SessionMessage, index) => {
                  const id = `${message.role}-${message.timestamp}-${index}`;

                  return message.role === "assistant" ? (
                    <div key={id} className="max-w-[54ch]">
                      <div className="rounded-2xl rounded-tl-sm bg-secondary px-5 py-4 text-sm leading-relaxed text-secondary-foreground">
                        {message.content}
                      </div>
                      <div className="mt-1.5 px-1 text-[11px] text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  ) : (
                    <div key={id} className="ml-auto max-w-[50ch]">
                      <div className="rounded-2xl rounded-tr-sm bg-primary px-5 py-4 text-sm leading-relaxed text-primary-foreground">
                        {message.content}
                      </div>
                      <div className="mt-1.5 px-1 text-right text-[11px] text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                    <span className="size-1.5 animate-pulse rounded-full bg-leaf" />
                    Thinking about what you said...
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                {workspaceError && (
                  <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {workspaceError}
                  </div>
                )}
                <label htmlFor="composer" className="sr-only">
                  Write a message
                </label>
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
                  <textarea
                    id="composer"
                    rows={2}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Say it plainly. No one else reads this."
                    className="min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Send message"
                    disabled={isSending || !draft.trim()}
                    onClick={() => void handleSendMessage()}
                    className="grid size-10 shrink-0 place-items-center rounded-full gradient-leaf text-primary-foreground disabled:opacity-60"
                  >
                    <SendHorizonal className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 px-1">
                  <SafetyNote compact />
                </div>
              </div>
            </section>

            <aside className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-1">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft lg:flex lg:min-h-0 lg:flex-col">
                <div className="eyebrow">Next steps</div>
                {workspaceLoading ? (
                  <p className="mt-4 text-sm text-muted-foreground">Loading steps...</p>
                ) : nextStepItems.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Next Steps are empty for now. Once your fear pattern is clearer, the guide will suggest actions to tick off.
                  </p>
                ) : (
                  <div className="mt-4 max-h-72 overflow-y-auto pr-1 lg:max-h-[44dvh]">
                    <ul className="space-y-3">
                      {nextStepItems.map((action) => {
                        const done = action.status === "completed";
                        return (
                          <li key={action._id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (!done) {
                                  void handleToggleAction(action);
                                }
                              }}
                              aria-pressed={done}
                              disabled={done}
                              className={`flex w-full items-start gap-3 rounded-2xl border border-border p-3 text-left ${
                                done ? "cursor-default" : "transition-colors hover:bg-secondary/60"
                              }`}
                            >
                              <span
                                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                                  done ? "border-leaf bg-leaf text-primary-foreground" : "border-border"
                                }`}
                              >
                                {done && <Check className="size-3" aria-hidden />}
                              </span>
                              <span className="min-w-0">
                                <span
                                  className={`block text-sm ${
                                    done ? "text-muted-foreground line-through" : "font-medium text-foreground"
                                  }`}
                                >
                                  {action.title}
                                </span>
                                {action.description && (
                                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                    {action.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-secondary/50 p-5">
                <div className="eyebrow">Reminder</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Consistency wins. Small steps repeated over time reduce fear like water carving rock.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Dialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{paywallReason} is part of Premium</DialogTitle>
            <DialogDescription>
              Your free session stays yours either way. Upgrade only if this is genuinely helping.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(toPaymentPlanType(plan.id))}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  selectedPlan === plan.id
                    ? "border-primary bg-secondary/60"
                    : plan.featured
                    ? "border-primary bg-secondary/60"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{plan.name}</span>
                  <span className="block text-xs text-muted-foreground">{plan.note}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-serif text-xl text-foreground">{plan.price}</span>
                  <span className="block text-[11px] text-muted-foreground">{plan.cadence}</span>
                </span>
              </button>
            ))}
          </div>

          {paymentError && (
            <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {paymentError}
            </div>
          )}

          <button
            type="button"
            disabled={isStartingPayment}
            onClick={() => void handleStartPayment()}
            className="mt-2 w-full rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isStartingPayment ? "Opening checkout..." : "Continue to payment"}
          </button>
          <Link to="/" hash="pricing" className="text-center text-xs text-muted-foreground hover:underline">
            Compare plans in detail
          </Link>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open && !isDeletingSession) {
            setPendingDeleteSession(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Delete this session?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{pendingDeleteSession?.title || pendingDeleteSession?.fearTitle || "this session"}</strong> from your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteOpen(false);
                setPendingDeleteSession(null);
              }}
              disabled={isDeletingSession}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleConfirmDeleteSessionAction();
              }}
              disabled={isDeletingSession}
              className="inline-flex items-center justify-center rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-60"
            >
              {isDeletingSession ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closePromptOpen} onOpenChange={setClosePromptOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Ready to close this session?</DialogTitle>
            <DialogDescription>
              You have completed all next steps. If this fear feels lighter, we can mark this chat as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setClosePromptOpen(false)}
              className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary"
            >
              Not yet
            </button>
            <button
              type="button"
              disabled={isCompletingSession}
              onClick={() => void handleCompleteSession()}
              className="flex-1 rounded-full gradient-leaf px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isCompletingSession ? "Closing..." : "Close session"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
