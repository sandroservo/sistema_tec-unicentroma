# 13 — Relatórios

## Escopo
Quatro relatórios gerenciais (acadêmico, frequência, financeiro, ocupação) somente-leitura: filtros de período/curso/turma, cards de totais, um gráfico Recharts, tabela paginada (12/página), exportação CSV (linhas completas) e impressão (`window.print()`). Sem models novos — agrega dados dos módulos existentes.

## API
Todas GET, permissão `relatorio:ler`. Datas `?de=&ate=` (YYYY-MM-DD); default **últimos 12 meses**; `ate` inclusivo. `linhas` limitadas a **1000**. Helper compartilhado `src/app/api/relatorios/periodo.ts`.

| Rota | Filtros | Retorno |
|---|---|---|
| `/api/relatorios/academico` | `de`, `ate`, `cursoId` | `totais {matriculasPeriodo, alunosAtivos (alunos distintos c/ status ativo), aprovados, reprovados, emCurso, evasao (matrícula trancada/inativa)}`, `porCurso [{curso, matriculas}]`, `linhas [{aluno, curso, turma, status, dataMatricula, media, situacao}]` |
| `/api/relatorios/frequencia` | `de`, `ate`, `turmaId` | `totais {turmas, alunosRisco, mediaGeralPct}`, `porTurma [{turma, curso, pct}]`, `linhas [{aluno, turma, totalAulas, presencas, faltas, pct, risco}]` — só turmas **com aulas no período**; alunos de matrícula ativa |
| `/api/relatorios/financeiro` | `de`, `ate` | `totais {recebidoPeriodo, pendente, vencido, bolsasAtivas, valorBolsas (Σ percentual das bolsas ativas)}`, `porMetodo`, `porMes`, `linhas [{aluno, descricao, valor, metodo, dataPagamento}]` — recebido = Cobranças + Parcelas com status `pago` e `dataPagamento` no período |
| `/api/relatorios/ocupacao` | — | `totais {turmasAtivas (em_andamento), vagasTotais, ocupadas, pctOcupacao}`, `porCurso [{curso, vagas, ocupadas}]`, `linhas [{turma, curso, sala, professor, vagas, ocupadas, pct, status}]` — turmas com status ≠ concluída/cancelada |

## Telas (`src/app/(app)/relatorios/*`)
- `academico`, `frequencia`, `financeiro`, `ocupacao` — todas "use client", TanStack Query + fetch local.
- Padrão: título + botões "Exportar CSV"/"Imprimir" (topo direito), barra de filtros com "Aplicar" (filtro só dispara ao aplicar), cards de totais, 1 BarChart Recharts (`hsl(var(--chart-N))`; financeiro tem 2: por mês e por método; ocupação tem 2 barras vagas vs ocupadas), tabela com `usePagination` + `PaginationBar`.
- Peças comuns em `relatorios/report-ui.tsx` (StatCard, ReportHeader, fetchJson, brl, fmtData, useReportError).
- CSV via `src/lib/csv.ts` — `exportCsv(filename, rows)`: separador `;`, BOM UTF-8, aspas escapadas, download por `<a download>`.

## Regras de negócio
- **Média/situação**: média ponderada Σ(valor·peso)/Σ(peso) dos lançamentos das avaliações da turma da matrícula; ≥6 aprovado, ≥4 recuperação, <4 reprovado, sem notas = cursando.
- **Frequência**: presente/atraso/justificada contam presença; risco < 75% (mesma regra de `/api/turmas/[id]/frequencia`); turma sem aula no período fica fora; pct da turma = média das pcts dos alunos.
- **Financeiro em aberto** (todas as datas, não só período): vencido = status pendente/vencido com vencimento < hoje; pendente = a vencer.
- Decimais → `Number()`; datas date-only via `dateOnly` e exibidas pt-BR; moeda BRL.

## Débitos
- `valorBolsas` é Σ de percentuais (não há valor monetário de referência por bolsa) — melhorar quando bolsa tiver base de cálculo.
- Impressão usa o print do navegador na página inteira (sem layout dedicado); filtros/botões escondidos via `print:hidden`.
- Paginação client-side sobre as 1000 primeiras linhas (sem paginação server-side).
- Relatório acadêmico: `alunosAtivos` conta só alunos das matrículas do período filtrado.

## Como testar
1. `npm run db:seed:demo` e logar como admin.
2. Acessar `/relatorios/academico|frequencia|financeiro|ocupacao` — cards, gráfico e tabela devem carregar (default 12 meses).
3. Aplicar filtros (datas curtas, curso/turma específicos) e conferir que totais/gráfico/tabela mudam.
4. "Exportar CSV" → abrir no Excel/LibreOffice (acentos ok pelo BOM, colunas pelo `;`). "Imprimir" → preview sem filtros/botões.
5. Sem permissão (`aluno`): APIs devem responder 403.
