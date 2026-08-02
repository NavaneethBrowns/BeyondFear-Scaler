export function CanopyLight({
  intensity = "full",
  palette = "canopy",
}: {
  intensity?: "full" | "soft";
  palette?: "canopy" | "neutral";
}) {
  const opacity = intensity === "full" ? "opacity-100" : "opacity-60";
  const firstGlow =
    palette === "neutral"
      ? "radial-gradient(circle, oklch(0.9 0.014 82 / 0.38), transparent 68%)"
      : "radial-gradient(circle, oklch(0.72 0.16 148 / 0.55), transparent 68%)";
  const secondGlow =
    palette === "neutral"
      ? "radial-gradient(circle, oklch(0.88 0.012 84 / 0.34), transparent 68%)"
      : "radial-gradient(circle, oklch(0.74 0.11 205 / 0.5), transparent 68%)";
  const thirdGlow =
    palette === "neutral"
      ? "radial-gradient(circle, oklch(0.93 0.01 80 / 0.42), transparent 70%)"
      : "radial-gradient(circle, oklch(0.84 0.09 92 / 0.55), transparent 70%)";

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${opacity}`}>
      <div
        className="canopy-a absolute -top-[35%] left-[-20%] h-[85%] w-[80%] rounded-full blur-[72px]"
        style={{ background: firstGlow }}
      />
      <div
        className="canopy-b absolute -top-[15%] right-[-25%] h-[90%] w-[75%] rounded-full blur-[78px]"
        style={{ background: secondGlow }}
      />
      <div
        className="canopy-a absolute top-[25%] left-[25%] h-[60%] w-[55%] rounded-full blur-[84px]"
        style={{
          animationDelay: "-12s",
          background: thirdGlow,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 40%, var(--color-background) 96%)",
        }}
      />
    </div>
  );
}

export function CanopyEdge() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
      <div
        className="canopy-b absolute -top-32 left-1/4 h-72 w-2/3 rounded-full blur-[74px]"
        style={{ background: "radial-gradient(circle, oklch(0.75 0.13 155 / 0.4), transparent 70%)" }}
      />
      <div
        className="canopy-a absolute -top-24 right-0 h-64 w-1/2 rounded-full blur-[74px]"
        style={{ background: "radial-gradient(circle, oklch(0.76 0.1 205 / 0.35), transparent 70%)" }}
      />
    </div>
  );
}
