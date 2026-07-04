// donoTipo -> recurso RBAC. Documentos herdam a permissão do dono.
const RECURSO: Record<string, string> = {
  Aluno: "aluno",
  Professor: "professor",
  Funcionario: "funcionario",
};

/** Permissão RBAC para (donoTipo, acao). null se donoTipo desconhecido. */
export function permFor(donoTipo: string, acao: "ler" | "editar"): string | null {
  const recurso = RECURSO[donoTipo];
  return recurso ? `${recurso}:${acao}` : null;
}
