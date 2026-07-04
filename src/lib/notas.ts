// Cálculo de média/situação — porte fiel do backend Express original.
export function calcularMedia(
  nota1: string | null,
  nota2: string | null,
  nota3: string | null,
  notaFinal: string | null,
): number | null {
  const n1 = nota1 ? parseFloat(nota1) : null;
  const n2 = nota2 ? parseFloat(nota2) : null;
  const n3 = nota3 ? parseFloat(nota3) : null;
  const nf = notaFinal ? parseFloat(notaFinal) : null;

  const notas = [n1, n2, n3, nf].filter((n) => n !== null) as number[];
  if (notas.length === 0) return null;
  return notas.reduce((sum, n) => sum + n, 0) / notas.length;
}

export function calcularSituacao(media: number | null): string {
  if (media === null) return "em_curso";
  if (media >= 6) return "aprovado";
  if (media >= 4) return "recuperacao";
  return "reprovado";
}
