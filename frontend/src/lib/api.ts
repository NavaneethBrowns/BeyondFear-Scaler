const API_BASE_URL = import.meta.env["VITE_API_URL"] || "http://localhost:5000/api";

export type ApiError = Error & {
  status?: number;
  details?: unknown;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      credentials: "include",
      body: options.body !== undefined ? JSON.stringify(options.body) : null,
    });
  } catch {
    const error = new Error(
      `Unable to reach backend at ${API_BASE_URL}. Check backend server and CORS origin settings.`,
    ) as ApiError;
    error.status = 0;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? String(
            (payload as Record<string, unknown>)["error"] ||
              (payload as Record<string, unknown>)["message"] ||
              "Request failed",
          )
        : "Request failed";

    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload as T;
}

export type AuthUser = {
  _id: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
  subscription?: {
    status?: "free" | "premium";
    planType?: string;
    freeSessions?: {
      used?: number;
      total?: number;
    };
    expiresAt?: string;
    nextResetDate?: string;
    lastPaymentDate?: string;
  };
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  expiresAt?: string;
};

export type SessionStatus = "active" | "archived" | "completed" | "deleted";

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type SessionRecord = {
  _id: string;
  title: string | null;
  fearTitle?: string | null;
  description?: string;
  tags?: string[];
  fearDescription?: string;
  fearCategory?: string;
  status: SessionStatus;
  messages?: SessionMessage[];
  fearIntensity?: {
    initialScore?: number;
    finalScore?: number;
    trend?: "decreased" | "increased" | "stable";
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type ActionLogStatus = "pending" | "in-progress" | "completed" | "skipped";

export type ActionLog = {
  _id: string;
  sessionId: string;
  title: string;
  description?: string;
  actionType?: "breathing" | "reflection" | "behavior-change" | "goal";
  status: ActionLogStatus;
  dueDate?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  priority?: "high" | "medium" | "low";
  difficulty?: "easy" | "medium" | "hard";
  createdAt: string;
  updatedAt: string;
};

export type ActionValidationResult = {
  isValid: boolean;
  feedback: string;
  confidence?: number;
};

export type DashboardSummaryResponse = {
  summary: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    averageIntensity: number;
    baselineIntensity: number;
    direction: "down" | "up" | "stable";
    directionDelta: number;
  };
  intensityTrend: Array<{
    session: string;
    intensity: number;
  }>;
  insights: {
    latestScore: number | null;
    bestScore: number | null;
    bestScoreTitle: string | null;
    momentumLabel: string;
    momentumNote: string;
    streakWeeks: number;
  };
  recentSessions: Array<{
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
    intensityStart: number;
    intensityNow: number;
    status: SessionStatus;
  }>;
};

export type PaymentPlanType = "monthly" | "quarterly" | "annual";

export type PaymentOrderResponse = {
  success: boolean;
  order: {
    order_id: string;
    amount: number;
    currency: string;
    planType: PaymentPlanType;
  };
  planDetails: {
    name: string;
    description: string;
    amount: number;
    durationDays: number;
  };
  keyId?: string;
};

type SendMessageResult = {
  message: string;
  sessionId: string;
  messagesCount: number;
  actionItems?: Array<{
    title: string;
    description?: string;
    actionType?: "breathing" | "reflection" | "behavior-change" | "goal";
    priority?: "high" | "medium" | "low";
    difficulty?: "easy" | "medium" | "hard";
    dueDate?: string | null;
  }>;
  actionLogs?: ActionLog[];
};

export const authApi = {
  signup(displayName: string, email: string, password: string) {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: { displayName, email, password },
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  me(token: string) {
    return request<{ user: AuthUser }>("/auth/me", { token });
  },
  logout(token: string) {
    return request<{ message: string }>("/auth/logout", {
      method: "POST",
      token,
    });
  },
};

export const sessionsApi = {
  list(token: string) {
    return request<{ sessions: SessionRecord[] }>("/sessions", { token });
  },
  create(
    token: string,
    payload: {
      title?: string;
      description?: string;
      fearIntensity?: number;
      incognito?: boolean;
    },
  ) {
    return request<{ session: SessionRecord }>("/sessions", {
      method: "POST",
      token,
      body: payload,
    });
  },
  get(token: string, sessionId: string) {
    return request<{ session: SessionRecord }>(`/sessions/${sessionId}`, { token });
  },
  update(
    token: string,
    sessionId: string,
    payload: { title?: string; description?: string; tags?: string[] },
  ) {
    return request<{ session: SessionRecord }>(`/sessions/${sessionId}`, {
      method: "PUT",
      token,
      body: payload,
    });
  },
  delete(token: string, sessionId: string) {
    return request<{ message: string }>(`/sessions/${sessionId}`, {
      method: "DELETE",
      token,
    });
  },
  updateIntensity(
    token: string,
    sessionId: string,
    payload: { initialScore?: number; finalScore?: number },
  ) {
    return request<{ session: SessionRecord }>(`/sessions/${sessionId}/intensity`, {
      method: "PATCH",
      token,
      body: payload,
    });
  },
  complete(token: string, sessionId: string, fearIntensity?: number) {
    return request<{ session: SessionRecord }>(`/sessions/${sessionId}/complete`, {
      method: "PATCH",
      token,
      body: typeof fearIntensity === "number" ? { fearIntensity } : {},
    });
  },
};

export const messagesApi = {
  send(token: string, payload: { sessionId: string; message: string; currentIntensity?: number }) {
    return request<SendMessageResult>("/messages/send", {
      method: "POST",
      token,
      body: payload,
    });
  },
};

export const actionLogsApi = {
  list(token: string, sessionId: string) {
    return request<{ actionLogs: ActionLog[] }>(`/sessions/${sessionId}/action-logs`, {
      token,
    });
  },
  update(
    token: string,
    sessionId: string,
    actionLogId: string,
    payload: Partial<Pick<ActionLog, "status" | "completedAt" | "skippedAt">>,
  ) {
    return request<{ actionLog: ActionLog }>(`/sessions/${sessionId}/action-logs/${actionLogId}`, {
      method: "PATCH",
      token,
      body: payload,
    });
  },
  validateCompletion(token: string, sessionId: string, actionLogId: string, responseText: string) {
    return request<{ actionLog: ActionLog; validation: ActionValidationResult }>(
      `/sessions/${sessionId}/action-logs/${actionLogId}/validate-completion`,
      {
        method: "PATCH",
        token,
        body: { responseText },
      },
    );
  },
};

export const dashboardApi = {
  summary(token: string) {
    return request<DashboardSummaryResponse>("/dashboard/summary", { token });
  },
};

export const paymentsApi = {
  createOrder(token: string, planType: PaymentPlanType) {
    return request<PaymentOrderResponse>("/payments/create-order", {
      method: "POST",
      token,
      body: { planType },
    });
  },
  verify(
    token: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    return request<{
      success: boolean;
      message: string;
      subscription: {
        status: "free" | "premium";
        planType: string;
        expiresAt: string;
      };
    }>("/payments/verify", {
      method: "POST",
      token,
      body: payload,
    });
  },
  recordFailure(token: string, payload: { orderId: string; reason?: string }) {
    return request<{ success: boolean; message: string }>("/payments/record-failure", {
      method: "POST",
      token,
      body: payload,
    });
  },
  status(token: string) {
    return request<{
      success: boolean;
      subscription: AuthUser["subscription"];
      sessions: {
        used: number;
        total: number;
        remaining: number;
        isUnlimited: boolean;
      };
      canCreateSession: boolean;
      limitMessage: string | null;
    }>("/payments/status", { token });
  },
};
