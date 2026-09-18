import { cn } from "@/lib/utils";

type SpartanBrandProps = {
  compact?: boolean;
  tone?: "light" | "dark";
  showFullLogo?: boolean;
  className?: string;
  onClick?: () => void;
};

// Clean square emblem icon crop extracted directly from user's high-res asset
const emblemUrl = "/manus-storage/spartan-emblem_2d346e99.png";
// Full original graphic with emblem + SPARTAN STACK text lockup
const fullLogoUrl = "/manus-storage/spartan-stack-logo_2c1af537.png";

export default function SpartanBrand({
  compact = false,
  tone = "dark",
  showFullLogo = false,
  className,
  onClick,
}: SpartanBrandProps) {
  if (showFullLogo) {
    const fullContent = (
      <img
        src={fullLogoUrl}
        alt="Spartan Stack by Spartan Nation"
        className="h-14 sm:h-16 w-auto aspect-square object-contain shrink-0"
      />
    );

    if (!onClick) {
      return <div className={cn("flex items-center", className)}>{fullContent}</div>;
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#d3aa54] rounded-lg", className)}
        aria-label="Spartan Stack home"
      >
        {fullContent}
      </button>
    );
  }

  const content = (
    <>
      <span className="relative flex h-10 w-10 shrink-0 aspect-square overflow-hidden rounded-xl border border-[#d3aa54]/60 bg-black p-0.5 shadow-md">
        <img
          src={emblemUrl}
          alt="Spartan Stack Crest"
          className="h-full w-full aspect-square object-contain block"
        />
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span
            className={cn(
              "block text-sm font-extrabold tracking-[0.12em]",
              tone === "dark" ? "text-white" : "text-[#14110c]"
            )}
          >
            SPARTAN STACK
          </span>
          <span className="mt-1 block text-[9px] font-bold tracking-[0.18em] text-[#d3aa54]">
            BY SPARTAN NATION
          </span>
        </span>
      )}
    </>
  );

  const brandClassName = cn(
    "group flex items-center gap-2.5 text-left rounded-lg",
    onClick &&
      "outline-none focus-visible:ring-2 focus-visible:ring-[#d3aa54] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0e]",
    className
  );

  if (!onClick) {
    return <div className={brandClassName}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={brandClassName}
      aria-label="Spartan Stack home"
    >
      {content}
    </button>
  );
}

export { emblemUrl as SPARTAN_EMBLEM_URL, fullLogoUrl as SPARTAN_FULL_LOGO_URL };
