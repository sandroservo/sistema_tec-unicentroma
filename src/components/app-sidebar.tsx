"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Book,
  ClipboardList,
  FileText,
  DollarSign,
  Award,
  Shield,
  ShieldCheck,
  DoorOpen,
  CalendarDays,
  ClipboardCheck,
  UserCheck,
  PencilLine,
  FileSignature,
  Percent,
  Handshake,
  AlertTriangle,
  MonitorPlay,
  ClipboardPen,
  LogOut,
  ChevronDown,
  Settings,
  Landmark,
  Headset,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { hasPermission } from "@/lib/rbac";
import { LogoTec } from "@/components/logo-tec";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/app/(app)/actions";

type NavItem = { k: string; href: string; icon: typeof Users; perm?: string };
// Item avulso no topo (fora de grupo).
const DASHBOARD: NavItem = { k: "dashboard", href: "/", icon: LayoutDashboard, perm: "dashboard:ler" };

// Menu agrupado por categoria (grupos colapsáveis). Item só aparece se o papel tiver a permissão.
const NAV_GROUPS: { g: string; icon: typeof Users; items: NavItem[] }[] = [
  {
    g: "academico",
    icon: GraduationCap,
    items: [
      { k: "alunos", href: "/alunos", icon: Users, perm: "aluno:ler" },
      { k: "responsaveis", href: "/responsaveis", icon: Users, perm: "aluno:editar" },
      { k: "professores", href: "/professores", icon: GraduationCap, perm: "professor:ler" },
      { k: "cursos", href: "/cursos", icon: BookOpen, perm: "curso:ler" },
      { k: "turmas", href: "/turmas", icon: Users, perm: "turma:ler" },
      { k: "disciplinas", href: "/disciplinas", icon: Book, perm: "disciplina:ler" },
      { k: "salas", href: "/salas", icon: DoorOpen, perm: "sala:ler" },
      { k: "matriculas", href: "/matriculas", icon: ClipboardList, perm: "matricula:ler" },
      { k: "rematriculas", href: "/rematriculas", icon: ClipboardList, perm: "matricula:ler" },
      { k: "calendario", href: "/calendario", icon: CalendarDays, perm: "calendario:ler" },
    ],
  },
  {
    g: "pedagogico",
    icon: ClipboardCheck,
    items: [
      { k: "diario", href: "/diario", icon: ClipboardCheck, perm: "aula:ler" },
      { k: "frequencia", href: "/frequencia", icon: UserCheck, perm: "frequencia:ler" },
      { k: "notas", href: "/notas", icon: FileText, perm: "nota:ler" },
      { k: "avaliacoes", href: "/avaliacoes", icon: PencilLine, perm: "nota:ler" },
      { k: "ocorrencias", href: "/ocorrencias", icon: AlertTriangle, perm: "ocorrencia:ler" },
      { k: "ead", href: "/ead", icon: MonitorPlay, perm: "ead:ler" },
    ],
  },
  {
    g: "financeiro",
    icon: Landmark,
    items: [
      { k: "caixa", href: "/caixa", icon: DollarSign, perm: "cobranca:editar" },
      { k: "financeiro", href: "/financeiro", icon: DollarSign, perm: "cobranca:ler" },
      { k: "contratos", href: "/contratos", icon: FileSignature, perm: "cobranca:ler" },
      { k: "inadimplencia", href: "/inadimplencia", icon: AlertTriangle, perm: "cobranca:ler" },
      { k: "contasPagar", href: "/contas-pagar", icon: DollarSign, perm: "despesa:ler" },
      { k: "planoContas", href: "/plano-contas", icon: FileText, perm: "despesa:ler" },
      { k: "fluxoCaixa", href: "/fluxo-caixa", icon: DollarSign, perm: "despesa:ler" },
      { k: "bolsas", href: "/bolsas", icon: Percent, perm: "cobranca:ler" },
      { k: "convenios", href: "/convenios", icon: Handshake, perm: "cobranca:ler" },
    ],
  },
  {
    g: "atendimento",
    icon: Headset,
    items: [
      { k: "requerimentos", href: "/requerimentos", icon: ClipboardList, perm: "requerimento:ler" },
      { k: "certificados", href: "/certificados", icon: Award, perm: "certificado:ler" },
      { k: "biblioteca", href: "/biblioteca", icon: BookOpen, perm: "biblioteca:ler" },
      { k: "selecao", href: "/selecao", icon: ClipboardPen, perm: "selecao:ler" },
    ],
  },
  {
    g: "relatorios",
    icon: BarChart3,
    items: [
      { k: "relAcademico", href: "/relatorios/academico", icon: BarChart3, perm: "relatorio:ler" },
      { k: "relFrequencia", href: "/relatorios/frequencia", icon: UserCheck, perm: "relatorio:ler" },
      { k: "relFinanceiro", href: "/relatorios/financeiro", icon: DollarSign, perm: "relatorio:ler" },
      { k: "relOcupacao", href: "/relatorios/ocupacao", icon: DoorOpen, perm: "relatorio:ler" },
    ],
  },
  {
    g: "comunicacao",
    icon: Megaphone,
    items: [
      { k: "avisos", href: "/avisos", icon: FileText, perm: "aviso:ler" },
      { k: "comunicados", href: "/comunicados", icon: FileText, perm: "comunicacao:enviar" },
    ],
  },
  {
    g: "configuracoes",
    icon: Settings,
    items: [
      { k: "usuarios", href: "/usuarios", icon: Shield, perm: "usuario:gerenciar" },
      { k: "integracoes", href: "/integracoes", icon: Handshake, perm: "usuario:gerenciar" },
    ],
  },
];

// Conteúdo do menu (dentro do SidebarProvider p/ ler estado colapsado).
function NavContent({ papel }: { papel: string }) {
  const pathname = usePathname();
  const t = useTranslations();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const can = (perm?: string) => !perm || hasPermission(papel, perm);
  // Item ativo (submenu) = verde CLARO (fundo verde translúcido + texto verde).
  const btnClass =
    "rounded-lg px-3 py-2.5 h-auto [&>svg]:!size-5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center " +
    "data-[active=true]:bg-[hsl(101_50%_40%)] data-[active=true]:text-white data-[active=true]:font-semibold " +
    "data-[active=true]:hover:bg-[hsl(101_50%_40%)] data-[active=true]:hover:text-white";

  return (
    <>
      {/* Dashboard avulso no topo */}
      {can(DASHBOARD.perm) && (
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip={t("nav.dashboard")} className={btnClass}>
                  <Link href="/" className="flex items-center gap-3">
                    <DASHBOARD.icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{t("nav.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Grupos colapsáveis */}
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) => can(i.perm));
        if (items.length === 0) return null;
        const groupActive = items.some((i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(i.href)));
        const GIcon = group.icon;
        return (
          // No modo colapsado força abrir (mostra os ícones dos itens).
          <Collapsible key={group.g} open={collapsed ? true : undefined} defaultOpen={groupActive} className="group/col">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger
                  className={
                    "flex h-auto w-full items-center rounded-lg px-3 py-2 text-xs uppercase tracking-wider transition-colors group-data-[collapsible=icon]:hidden " +
                    (groupActive
                      ? "bg-[hsl(101_50%_30%)] font-semibold text-white hover:bg-[hsl(101_50%_30%)] hover:text-white"
                      : "text-sidebar-foreground/70 hover:bg-white/10 hover:!text-white")
                  }
                >
                  <GIcon className="mr-2 h-4 w-4 shrink-0" />
                  {t(`grupos.${group.g}`)}
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=closed]/col:-rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              {/* Marcador do grupo (só no modo colapsado): ícone centralizado */}
              <div
                className={
                  "hidden justify-center py-1 group-data-[collapsible=icon]:flex " +
                  (groupActive ? "text-[hsl(101_55%_60%)]" : "text-sidebar-foreground/50")
                }
                title={t(`grupos.${group.g}`)}
              >
                <GIcon className="h-4 w-4" />
              </div>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                      const label = t(`nav.${item.k}`);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={label} className={btnClass}>
                            <Link href={item.href} className="flex items-center gap-3">
                              <item.icon className="h-4 w-4" />
                              <span className="font-medium text-sm">{label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}

export function AppSidebar({
  papel,
  userName,
  children,
}: {
  papel: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const iniciais = (userName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "290px", "--sidebar-width-icon": "90px" } as React.CSSProperties}
    >
      <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="px-4 pt-5 pb-3">
          <Link href="/" className="block group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            {/* Expandido: logo oficial em cartão branco. Colapsado: brandmark. */}
            <div className="rounded-xl bg-white p-3 shadow-sm group-data-[collapsible=icon]:hidden">
              <Image
                src="/logo_erp.png"
                alt="ERP Escola — TEC Unicentro"
                width={1920}
                height={819}
                priority
                className="h-auto w-full"
              />
            </div>
            <LogoTec className="hidden group-data-[collapsible=icon]:flex" />
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <NavContent papel={papel} />
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Header verde escuro (mesmos tokens do sidebar) */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:px-6">
          <SidebarTrigger className="h-10 w-10 rounded-lg border border-white/20 text-sidebar-foreground/80 hover:bg-white/10 hover:text-white" />
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-white/15 text-white text-sm font-medium">{iniciais}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-sidebar-foreground md:inline">{userName}</span>
              <ChevronDown className="hidden h-4 w-4 text-sidebar-foreground/70 md:inline" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{userName}</span>
                  <span className="text-xs font-normal text-muted-foreground capitalize">{papel.replace("_", " ")}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/conta/seguranca" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> {t("nav.seguranca")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={signOutAction} className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2 text-left">
                    <LogOut className="h-4 w-4" /> {t("nav.sair")}
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
