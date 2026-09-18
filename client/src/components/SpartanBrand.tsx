import { cn } from "@/lib/utils";

type SpartanBrandProps = {
  compact?: boolean;
  tone?: "light" | "dark";
  className?: string;
  onClick?: () => void;
};

const logoUrl = "/manus-storage/spartan-stack-logo_2c1af537.png";

export default function SpartanBrand({ compact = false, tone = "dark", className, onClick }: SpartanBrandProps) {
  const content = (
    <>
      <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#d3aa54]/55 bg-[#050505] shadow-[0_5px_15px_rgba(0,0,0,0.35)]">
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full scale-[1.48] origin-top object-cover object-top"
        />
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className={cn("block text-sm font-extrabold tracking-[0.11em]", tone === "dark" ? "text-white" : "text-[#14110c]")}>SPARTAN STACK</span>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.16em] text-[#d8b865]">BY SPARTAN NATION</span>
        </span>
      )}
    </>
  );

  const brandClassName = cn(
    "group flex items-center gap-2.5 text-left rounded-lg",
    onClick && "outline-none focus-visible:ring-2 focus-visible:ring-[#d3aa54] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0e]",
    className,
  );

  if (!onClick) {
    return <div className={brandClassName}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={brandClassName} aria-label="Spartan Stack home">
      {content}
    </button>
  );
}

export { logoUrl as SPARTAN_LOGO_URL };
