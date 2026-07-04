import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

const createSchema = z.object({
  forumId: z.number().int(),
  mensagem: z.string().min(1),
  parentId: z.number().int().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const sp = new URL(req.url).searchParams;
    const forumId = sp.get("forumId");
    const where = forumId ? { forumId: parseInt(forumId) } : {};
    const posts = await prisma.postForum.findMany({
      where,
      orderBy: { criadoEm: "asc" },
    });
    // autorNome via join no User (autorUserId é o id do User).
    const autores = await prisma.user.findMany({
      where: { id: { in: [...new Set(posts.map((p) => p.autorUserId))] } },
      select: { id: true, nome: true },
    });
    const nomes = new Map(autores.map((a) => [a.id, a.nome]));
    return NextResponse.json({
      data: posts.map((p) => ({
        id: p.id,
        forumId: p.forumId,
        autorUserId: p.autorUserId,
        autorNome: nomes.get(p.autorUserId) ?? null,
        mensagem: p.mensagem,
        parentId: p.parentId,
        criadoEm: p.criadoEm,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const d = parsed.data;
    const post = await prisma.postForum.create({
      data: { forumId: d.forumId, mensagem: d.mensagem, parentId: d.parentId ?? null, autorUserId: user.id },
    });
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar post" }, { status: 500 });
  }
}
