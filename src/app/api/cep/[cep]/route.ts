import { NextResponse } from "next/server";
import { currentUser } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ cep: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { cep: raw } = await params;
  const cep = raw.replace(/\D/g, "");
  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  } catch {
    return NextResponse.json({ error: "Falha ao consultar CEP" }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: "Falha ao consultar CEP" }, { status: 502 });

  const data = await res.json();
  if (data.erro) return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });

  return NextResponse.json({
    cep: data.cep,
    logradouro: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    estado: data.uf,
  });
}
