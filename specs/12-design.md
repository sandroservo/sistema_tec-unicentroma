# 12 — Design system

## Escopo
Base **TailAdmin** (grays UntitledUI) adaptada ao **verde da logo TEC Unicentro (#3d7c2d)**, sobre Tailwind 4 + shadcn/ui. Tema claro/escuro via `next-themes`. Tudo tokenizado em `src/app/globals.css` (HSL sem `hsl()`, mapeado no `@theme inline`).

## Tokens (`src/app/globals.css`)
| Token | Claro | Escuro |
|---|---|---|
| `--primary` | `101 47% 33%` (verde TEC #3d7c2d) | `100 44% 46%` (mais claro p/ contraste) |
| `--background` / `--foreground` | `210 20% 98%` (gray-50) / `220 43% 11%` (gray-900) | `222 41% 8%` (gray-950) / `210 20% 98%` |
| `--card` / `--card-border` | branco / `218 17% 91%` (gray-200) | `220 43% 11%` / `214 33% 17%` (gray-800) |
| `--accent` | `100 44% 95%` (verde bem claro) | `214 33% 17%` (fg verde claro) |
| `--destructive` | `4 86% 58%` (#f04438) | idem |
| `--ring` | = primary | = primary |
| **`--sidebar`** | **`152 40% 13%` — VERDE ESCURO nos DOIS temas** (dark: `152 40% 12%`) | `--sidebar-foreground 150 18% 88%`, `--sidebar-primary 101 50% 45%`, `--sidebar-accent 152 28% 22%` (hover) |
| `--chart-1..5` | verde TEC / verde-limão (arco da logo) / success #12b76a / warning #f79009 / azul info | versões mais claras |
| `--radius` | **0.75rem** (sm/md/lg/xl derivados ±) | — |

Fonte: **Inter** via `next/font/google` em `src/app/layout.tsx` (`variable: --font-inter` → `--app-font-sans` → `--font-sans`). Serif Georgia, mono Menlo (fallbacks).

## Componentes de shell
- **Sidebar** (`src/components/app-sidebar.tsx`, shadcn Sidebar): largura **290px**, colapsada **90px** (`--sidebar-width[-icon]` inline), `collapsible="icon"`. Header: logo oficial `/logo_erp.png` em **cartão branco arredondado**; colapsado mostra brandmark `LogoTec` (tile verde "tec" itálico). Nav: item avulso Dashboard + **`NAV_GROUPS`** (academico, pedagogico, financeiro, atendimento, comunicacao, configuracoes) — grupos **colapsáveis** (Collapsible) com ícone + label uppercase; labels via `next-intl` (`messages/pt-BR.json`, `grupos.*`/`nav.*`); item só renderiza se `hasPermission(papel, perm)`. Estados: **item ativo = verde sólido** `bg-[hsl(101_50%_40%)]` texto branco; **trigger de grupo ativo = verde médio** `bg-[hsl(101_50%_30%)]`; hover `white/10`. Colapsado: grupos abertos à força, marcador de grupo = ícone centralizado (ativo em `hsl(101 55% 60%)`), tooltips nos itens.
- **Header**: sticky h-16, **verde escuro — reusa os tokens do sidebar** (`bg-sidebar text-sidebar-foreground border-sidebar-border`). Conteúdo: `SidebarTrigger` (hamburger com borda `white/20`), spacer, `ThemeToggle`, `NotificationBell`, dropdown de avatar (iniciais em `bg-white/15`, nome, papel, link Segurança `/conta/seguranca`, Sair via server action).
- **Main**: `max-w-screen-2xl` centralizado, `p-4 md:p-6`.
- **Login** (`src/app/login/page.tsx`): **split-screen** `lg:grid-cols-2`. Esquerda: formulário (identificador CPF/e-mail/matrícula, senha com olho, passo MFA condicional, botão Google condicional, link p/ `/inscricao`). Direita: **painel verde escuro** `bg-[hsl(101_46%_12%)]` com grid sutil de linhas brancas 48px (mask radial), dois glows verdes blur-3xl e **`/logo_erp.png` em cartão branco** rounded-2xl. ThemeToggle flutuante bottom-right.

## Padrões visuais
- **Título de página**: `<h1 className="text-2xl font-semibold tracking-tight">` + parágrafo `text-muted-foreground` — usado em todas as páginas do (app) e portais.
- **Stat card** (dashboard, estilo TailAdmin): `Card` com **ícone em tile** `h-12 w-12 rounded-xl bg-muted`, label `text-sm text-muted-foreground`, **valor `text-2xl font-semibold`**, badge `secondary` com sub-info à direita.
- CRUDs leves em **Dialog** (criar/editar) + **AlertDialog** para exclusão; formulários RHF+Zod com shadcn Form.
- Gráficos: Recharts com cores `--chart-*`.
- **FullCalendar** com CSS custom nos tokens (final do `globals.css`): toolbar com chunk de views em pílula `bg-muted`, botões prev/next quadrados com chevrons SVG inline, botão "add event" em `--primary`, células/headers em `--border`/`--muted`, eventos como cartões translúcidos (`fc-bg-primary|danger|success|warning` a 10–14% de opacidade) com barra vertical colorida (dot custom).
- **Dark mode**: `next-themes` em `src/app/providers.tsx` (`attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`); toggle no header e no login; variante Tailwind `@custom-variant dark (&:is(.dark *))`. Sidebar/header permanecem verde escuro em ambos os temas.

## Logos e assets (`public/`)
- `logo_erp01.png` — banner; `logo_erp.png` — logo horizontal oficial (sidebar expandido e login, sempre sobre cartão branco); `favicon.png` (declarado em `metadata.icons`; `favicon.svg` e `logo.png` também existem); `opengraph.jpg`.
- `LogoTec` (`src/components/logo-tec.tsx`) — brandmark aproximado em CSS ("tec" itálico em tile `bg-primary`) usado no sidebar colapsado.

## Débitos
- Cores verdes do estado ativo do sidebar estão hardcoded em classes arbitrárias (`hsl(101 50% 40%)` etc.) no `app-sidebar.tsx`, fora dos tokens.
- `LogoTec` é aproximação em CSS — comentário no código pede `public/logo-tec.svg` oficial.
- Painel esquerdo do login usa verde `hsl(101 46% 12%)` também hardcoded (difere do token do sidebar `152 40% 13%`).
- Página pública `/inscricao` usa estilo inline próprio, fora do design system.

## Como testar
1. `npm run dev`, logar como admin: sidebar verde escuro com grupos colapsáveis; navegar → item fica verde sólido e o grupo pai verde médio; colapsar → 90px com ícones e tooltips.
2. Alternar tema no header: conteúdo muda claro/escuro, sidebar/header continuam verde escuro.
3. Logar como `financeiro`: grupos acadêmico/pedagógico somem (filtro por permissão).
4. Conferir login split-screen em viewport lg+ e `/calendario` com o estilo custom do FullCalendar.
