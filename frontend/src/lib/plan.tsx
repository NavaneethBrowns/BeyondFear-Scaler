import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export type Plan = "free" | "premium";

type PlanContextValue = {
  plan: Plan;
  isPremium: boolean;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const plan = user?.subscription?.status === "premium" ? "premium" : "free";

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      isPremium: plan === "premium",
    }),
    [plan],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
