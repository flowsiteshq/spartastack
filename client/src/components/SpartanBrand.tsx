import { cn } from "@/lib/utils";
import { SPARTAN_EMBLEM_DATA_URI } from "./spartanLogoAssets";

type SpartanBrandProps = {
  compact?: boolean;
  tone?: "light" | "dark";
  showFullLogo?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function SpartanBrand({
  compact = false,
  tone = "dark",
  showFullLogo: _showFullLogo = false,
  className,
  onClick,
}: SpartanBrandProps) {
  const content = (
    <div className="flex items-center gap-3 select-none">
      {/* Precision fixed-square container that cannot distort under any flexbox constraint */}
      <div
        className="relative shrink-0 rounded-xl border border-[#d3aa54]/70 bg-black p-1 shadow-md flex items-center justify-center overflow-hidden"
        style={{ width: "42px", height: "42px", minWidth: "42px", minHeight: "42px" }}
      >
        <img
          src={SPARTAN_EMBLEM_DATA_URI}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain pointer-events-none"
          style={{ aspectRatio: "1 / 1" }}
        />
      </div>

      {!compact && (
        <div className="flex flex-col justify-center min-w-0">
          <span
            className={cn(
              "text-sm font-black tracking-[0.14em] uppercase leading-tight font-sans",
              tone === "dark" ? "text-white" : "text-[#14110c]"
            )}
          >
            SPARTAN STACK
          </span>
          <span className="text-[9px] font-extrabold tracking-[0.2em] text-[#d3aa54] uppercase leading-tight mt-0.5">
            BY SPARTAN NATION
          </span>
        </div>
      )}
    </div>
  );

  const brandClassName = cn(
    "group flex items-center text-left rounded-lg transition-transform",
    onClick &&
      "outline-none focus-visible:ring-2 focus-visible:ring-[#d3aa54] hover:opacity-90 active:scale-95 cursor-pointer",
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

export { SPARTAN_EMBLEM_DATA_URI as SPARTAN_EMBLEM_URL };
