# Specs — índice

Estado REAL do sistema, por módulo. Cada spec: escopo, models, rotas API (+permissão), telas, regras de negócio, débitos, como testar. **Atualize a spec quando mudar o módulo.**

| Spec | Cobre |
|---|---|
| [00-arquitetura](00-arquitetura.md) | Stack, decisões, estrutura de pastas, libs compartilhadas |
| [01-auth-rbac](01-auth-rbac.md) | Login (CPF/email/matrícula), MFA, reset senha, RBAC, usuários, auditoria, rate-limit |
| [02-academico](02-academico.md) | Alunos, responsáveis, professores, cursos, turmas, disciplinas, salas, matrículas, rematrículas, calendário |
| [03-pedagogico](03-pedagogico.md) | Diário, frequência, notas legadas, avaliações c/ peso, ocorrências, plano de ensino |
| [04-financeiro](04-financeiro.md) | Cobranças, contratos/parcelas, bolsas, convênios, inadimplência, renegociação, contas a pagar, plano de contas, fluxo de caixa |
| [05-portais](05-portais.md) | Portal aluno, professor, responsável; landing por papel (middleware) |
| [06-ead](06-ead.md) | Módulos/aulas EAD, progresso, questionários c/ autocorreção, fórum, entregas |
| [07-selecao](07-selecao.md) | Processo seletivo, inscrição pública, resultado, convocação, matrícula automática |
| [08-biblioteca](08-biblioteca.md) | Acervo, exemplares, empréstimos/devolução, multas, reservas, QR |
| [09-comunicacao](09-comunicacao.md) | Notificações (SSE), comunicados (broadcast), mural de avisos |
| [10-atendimento](10-atendimento.md) | Requerimentos/protocolos, certificados, PDFs (boletim/declaração/histórico), documentos/upload |
| [11-integracoes](11-integracoes.md) | SMTP, Evolution/WhatsApp, PIX (stub), assinatura (stub), Google OAuth, ViaCEP |
| [12-design](12-design.md) | Tema verde TEC/TailAdmin, tokens, sidebar agrupado, header, login split, fontes |
| [13-relatorios](13-relatorios.md) | Relatórios gerenciais (acadêmico, frequência, financeiro, ocupação) c/ filtros, gráficos, CSV e impressão |

Visão macro/roadmap original: [`../../SPEC.md`](../../SPEC.md).
