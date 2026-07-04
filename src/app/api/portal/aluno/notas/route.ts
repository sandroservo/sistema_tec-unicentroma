import { NextResponse } from "next/server";
import { requireAluno } from "@/lib/portal";
import { mediasPorDisciplina } from "../_media";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const medias = await mediasPorDisciplina(guard.alunoId);
  return NextResponse.json(medias);
}
