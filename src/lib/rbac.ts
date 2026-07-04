// RBAC por matriz definida em código. Papéis são fixos (spec Fase 1).
// ponytail: matriz em código, não em tabela. Papéis customizáveis pelo usuário só se surgir a necessidade.

export const ROLES = [
  "super_admin",
  "diretor",
  "coordenador",
  "secretaria",
  "financeiro",
  "rh",
  "professor",
  "bibliotecario",
  "aluno",
  "responsavel",
  "candidato",
] as const;

export type Role = (typeof ROLES)[number];

// Permissões no formato "recurso:acao". Curingas: "*" (tudo) e "recurso:*" (todas ações do recurso).
// acoes comuns: ler, criar, editar, excluir, e específicas (lancar, emitir, renegociar...).
const PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  diretor: ["*"],
  coordenador: [
    "dashboard:ler",
    "aluno:*",
    "professor:*",
    "curso:*",
    "turma:*",
    "disciplina:*",
    "matricula:*",
    "nota:*",
    "certificado:*",
    "sala:*",
    "calendario:*",
    "aula:*",
    "frequencia:*",
    "planoensino:*",
    "ead:*",
    "selecao:*",
    "comunicacao:*",
    "requerimento:*",
    "ocorrencia:*",
    "aviso:*",
    "relatorio:ler",
  ],
  secretaria: [
    "dashboard:ler",
    "aluno:*",
    "professor:ler",
    "curso:ler",
    "turma:*",
    "disciplina:ler",
    "matricula:*",
    "certificado:*",
    "sala:*",
    "calendario:*",
    "planoensino:ler",
    "selecao:*",
    "comunicacao:*",
    "requerimento:*",
    "ocorrencia:*",
    "aviso:*",
    "relatorio:ler",
  ],
  financeiro: [
    "dashboard:ler",
    "aluno:ler",
    "cobranca:*",
    "despesa:*",
    "relatorio:ler",
  ],
  rh: ["dashboard:ler", "professor:*", "funcionario:*"],
  professor: [
    "dashboard:ler",
    "turma:ler",
    "disciplina:ler",
    "nota:lancar",
    "nota:ler",
    "aluno:ler",
    "sala:ler",
    "calendario:ler",
    "aula:ler",
    "aula:criar",
    "aula:editar",
    "aula:excluir",
    "frequencia:ler",
    "frequencia:lancar",
    "planoensino:ler",
    "planoensino:editar",
    "ead:ler",
    "ead:criar",
    "ead:editar",
    "ead:excluir",
    "ead:corrigir",
    "ocorrencia:ler",
    "ocorrencia:registrar",
  ],
  bibliotecario: ["dashboard:ler", "biblioteca:*", "aluno:ler"],
  aluno: ["portal:aluno"],
  responsavel: ["portal:responsavel"],
  candidato: ["portal:candidato"],
};

/** true se o papel tem a permissão (considera curingas "*" e "recurso:*"). */
export function hasPermission(papel: string | undefined | null, perm: string): boolean {
  if (!papel) return false;
  const grants = PERMISSIONS[papel as Role];
  if (!grants) return false;
  if (grants.includes("*") || grants.includes(perm)) return true;
  const [recurso] = perm.split(":");
  return grants.includes(`${recurso}:*`);
}

export function isRole(papel: string | undefined | null): papel is Role {
  return !!papel && (ROLES as readonly string[]).includes(papel);
}
