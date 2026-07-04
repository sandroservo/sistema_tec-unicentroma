import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

/** id do Aluno vinculado ao usuário logado (ou null). */
export async function currentAlunoId(): Promise<number | null> {
  const u = await currentUser();
  if (!u) return null;
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { alunoId: true } });
  return row?.alunoId ?? null;
}

/** id do Professor vinculado ao usuário logado (ou null). */
export async function currentProfessorId(): Promise<number | null> {
  const u = await currentUser();
  if (!u) return null;
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { professorId: true } });
  return row?.professorId ?? null;
}

/** Guard de route handler do portal do aluno: {alunoId} ou 401/403. */
export async function requireAluno() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const alunoId = await currentAlunoId();
  if (!alunoId) return NextResponse.json({ error: "Conta não vinculada a um aluno" }, { status: 403 });
  return { alunoId };
}

/** Guard de route handler do portal do professor: {professorId} ou 401/403. */
export async function requireProfessor() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const professorId = await currentProfessorId();
  if (!professorId) return NextResponse.json({ error: "Conta não vinculada a um professor" }, { status: 403 });
  return { professorId };
}

/** id do Responsável vinculado ao usuário logado (ou null). */
export async function currentResponsavelId(): Promise<number | null> {
  const u = await currentUser();
  if (!u) return null;
  const row = await prisma.user.findUnique({ where: { id: u.id }, select: { responsavelId: true } });
  return row?.responsavelId ?? null;
}

/** ids dos alunos vinculados ao responsável logado. */
export async function currentResponsavelAlunoIds(): Promise<number[]> {
  const respId = await currentResponsavelId();
  if (!respId) return [];
  const resp = await prisma.responsavel.findUnique({
    where: { id: respId },
    select: { alunos: { select: { id: true } } },
  });
  return resp?.alunos.map((a) => a.id) ?? [];
}

/** Guard de route handler do portal do responsável: {responsavelId, alunoIds} ou 401/403. */
export async function requireResponsavel() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const responsavelId = await currentResponsavelId();
  if (!responsavelId) return NextResponse.json({ error: "Conta não vinculada a um responsável" }, { status: 403 });
  const alunoIds = await currentResponsavelAlunoIds();
  return { responsavelId, alunoIds };
}
