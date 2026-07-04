import { cn } from "@/lib/utils";

// Brandmark "tec" (aprox. da logo TEC Unicentro). Para o logo oficial,
// coloque o arquivo em public/logo-tec.svg e troque por <img src="/logo-tec.svg" />.
export function LogoTec({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="text-lg font-extrabold italic lowercase leading-none tracking-tight">tec</span>
    </span>
  );
}
