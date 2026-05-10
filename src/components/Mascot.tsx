type MascotVariant = "wave" | "bell" | "thumbs" | "tools";
type MascotSize = "xs" | "sm" | "md" | "lg" | "hero" | "jumbo";
type MascotAnimation = "none" | "float" | "pop" | "wiggle" | "wave" | "bounce" | "sway";

const mascotSources: Record<MascotVariant, string> = {
  wave: "/mascots/mascot-wave.png",
  bell: "/mascots/mascot-bell.png",
  thumbs: "/mascots/mascot-thumbs.png",
  tools: "/mascots/mascot-tools.png",
};

const mascotLabels: Record<MascotVariant, string> = {
  wave: "PMC mascot waving",
  bell: "PMC mascot notification",
  thumbs: "PMC mascot thumbs up",
  tools: "PMC mascot tools",
};

export function Mascot({
  variant,
  size = "md",
  animation = "none",
  className = "",
  decorative = true,
}: {
  variant: MascotVariant;
  size?: MascotSize;
  animation?: MascotAnimation;
  className?: string;
  decorative?: boolean;
}) {
  const classes = [
    "mascot",
    `mascot-${size}`,
    animation !== "none" ? `mascot-${animation}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <img
      className={classes}
      src={mascotSources[variant]}
      alt={decorative ? "" : mascotLabels[variant]}
      aria-hidden={decorative ? "true" : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}
