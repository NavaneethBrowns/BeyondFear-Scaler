import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  sessionsApi,
  type ActionLog,
  type SessionMessage,
  type SessionRecord,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlan } from "@/lib/plan";
import { plans } from "@/data/mock";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
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
  const { isAuthenticated, isLoading, token } = useAuth();
  const { isPremium } = usePlan();

  const [sessionList, setSessionList] = useState<SessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("Unlimited sessions");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [intensity, setIntensity] = useState(5);
  const [isSavingIntensity, setIsSavingIntensity] = useState(false);

  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, isLoading, navigate]);

  function requirePremium(reason: string) {
    setPaywallReason(reason);
    setPaywallOpen(true);
  }

  async function ensureStarterSession(currentSessions: SessionRecord[]) {
    if (!token) return currentSessions;
    if (currentSessions.length > 0) return currentSessions;

    const created = await sessionsApi.create(token, {
      title: "My first fear session",
      fearIntensity: 5,
    });

    return [created.session];
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
      setIntensity(session.fearIntensity?.initialScore ?? 5);
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
        fearIntensity: 5,
      });

      await loadSessions(created.session._id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to create session.");
    }
  }

  async function handleSendMessage() {
    if (!token || !activeSession || !draft.trim() || isSending) return;

    const outbound = draft.trim();
    setDraft("");
    setIsSending(true);
    setWorkspaceError("");

    try {
      await messagesApi.send(token, {
        sessionId: activeSession._id,
        message: outbound,
        currentIntensity: intensity,
      });

      await loadWorkspace(activeSession._id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to send message.");
      setDraft(outbound);
    } finally {
      setIsSending(false);
    }
  }

  async function persistIntensity(value: number) {
    if (!token || !activeSession) return;

    setIsSavingIntensity(true);
    try {
      const updated = await sessionsApi.updateIntensity(token, activeSession._id, {
        initialScore: value,
      });
      setActiveSession(updated.session);
      setSessionList((previous) =>
        previous.map((session) =>
          session._id === updated.session._id ? { ...session, ...updated.session } : session,
        ),
      );
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to update intensity.");
    } finally {
      setIsSavingIntensity(false);
    }
  }

  async function handleToggleAction(action: ActionLog) {
    if (!token || !activeSession) return;

    const nextStatus = action.status === "completed" ? "pending" : "completed";

    try {
      const result = await actionLogsApi.update(token, activeSession._id, action._id, {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
      });

      setActionLogs((previous) =>
        previous.map((item) => (item._id === result.actionLog._id ? result.actionLog : item)),
      );
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to update next step.");
    }
  }

  async function handleCompleteSession() {
    if (!token || !activeSession) return;

    setIsCompletingSession(true);
    setWorkspaceError("");

    try {
      await sessionsApi.complete(token, activeSession._id, intensity);
      setClosePromptOpen(false);
      await loadSessions(activeSession._id);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to complete session.");
    } finally {
      setIsCompletingSession(false);
    }
  }

  const activeTitle = activeSession?.title || activeSession?.fearTitle || "Session";
  const startedAtIntensity = activeSession?.fearIntensity?.initialScore ?? 5;

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
                            {session.title || session.fearTitle || "Untitled Session"}
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
                              if (!isPremium) {
                                event.preventDefault();
                                requirePremium("Renaming sessions");
                              }
                            }}
                          >
                            {isPremium ? <Pencil className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              requirePremium("Incognito sessions");
                            }}
                          >
                            {isPremium ? <EyeOff className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
                            Make incognito
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={isPremium ? "text-destructive focus:text-destructive" : undefined}
                            onSelect={(event) => {
                              event.preventDefault();
                              requirePremium("Deleting sessions");
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
                    {messages.length} messages - started at intensity {startedAtIntensity}
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
              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                <div className="eyebrow">Where you are now</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-serif text-4xl text-foreground">{intensity}</span>
                  <span className="text-sm text-muted-foreground">/ 10 intensity</span>
                </div>
                <label htmlFor="intensity" className="mt-4 block text-xs text-muted-foreground">
                  How heavy does it feel right now?
                </label>
                <input
                  id="intensity"
                  type="range"
                  min={1}
                  max={10}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  onMouseUp={() => void persistIntensity(intensity)}
                  onTouchEnd={() => void persistIntensity(intensity)}
                  className="mt-2 w-full accent-[var(--color-leaf)]"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Started at {startedAtIntensity}. No wrong answer here.
                </p>
                {isSavingIntensity && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Saving intensity...</p>
                )}
              </div>

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
                              onClick={() => void handleToggleAction(action)}
                              aria-pressed={done}
                              className="flex w-full items-start gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:bg-secondary/60"
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
                className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  plan.featured
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

          <button
            type="button"
            onClick={() => setPaywallOpen(false)}
            className="mt-2 w-full rounded-full gradient-leaf px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Continue to payment
          </button>
          <Link to="/" hash="pricing" className="text-center text-xs text-muted-foreground hover:underline">
            Compare plans in detail
          </Link>
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
