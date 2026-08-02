import { Link } from "@tanstack/react-router";

export function SafetyNote({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={
        compact
          ? "text-xs leading-relaxed text-muted-foreground"
          : "max-w-[70ch] text-sm leading-relaxed text-muted-foreground"
      }
    >
      Beyond Fear is a reflective tool for thinking clearly and taking small steps. It is not therapy
      and not a replacement for professional mental health care. If you are in crisis or at risk,
      please reach out to a licensed professional or a local emergency helpline right away.
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-serif text-xl text-foreground">Beyond Fear</div>
            <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              One honest conversation, one grounded next step. Built to help you leave stronger, not
              to keep you coming back.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">Product</span>
            <Link to="/chat" className="w-fit text-sm text-muted-foreground hover:text-foreground">
              Sessions
            </Link>
            <Link to="/dashboard" className="w-fit text-sm text-muted-foreground hover:text-foreground">
              Progress
            </Link>
            <a href="/#pricing" className="w-fit text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">Company</span>
            <a href="/#philosophy" className="w-fit text-sm text-muted-foreground hover:text-foreground">
              Philosophy
            </a>
            <a href="/#method" className="w-fit text-sm text-muted-foreground hover:text-foreground">
              The method
            </a>
            <span className="text-sm text-muted-foreground">Privacy</span>
          </div>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card p-6">
          <div className="eyebrow mb-3">Please read</div>
          <SafetyNote />
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Beyond Fear. Made in India.
        </div>
      </div>
    </footer>
  );
}
