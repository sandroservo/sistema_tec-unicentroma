// Resolve um identificador de login (e-mail, CPF ou matrícula) para um filtro Prisma de User.
export function whereFromIdentificador(raw: string) {
  const v = raw.trim();
  if (v.includes("@")) return { email: v.toLowerCase() };
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11) return { cpf: digits };
  return { matricula: v };
}
