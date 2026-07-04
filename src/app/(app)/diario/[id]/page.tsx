"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

type Aula = {
  id: number; data: string; turmaNome: string | null; disciplinaNome: string | null;
  conteudo: string; observacoes: string | null;
};
type Presenca = { alunoId: number; alunoNome: string; status: string; justificativa: string | null };

const STATUS = ["presente", "falta", "atraso", "justificada"] as const;

export default function ChamadaPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [rows, setRows] = useState<Presenca[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: aula } = useQuery<Aula>({
    queryKey: ["aula", id],
    queryFn: () => fetch(`/api/aulas/${id}`).then((r) => r.json()),
  });

  const { data: presencas } = useQuery<Presenca[]>({
    queryKey: ["presencas", id],
    queryFn: () => fetch(`/api/aulas/${id}/presencas`).then((r) => r.json()),
  });

  useEffect(() => {
    if (presencas) setRows(presencas);
  }, [presencas]);

  function update(alunoId: number, patch: Partial<Presenca>) {
    setRows((prev) => prev.map((r) => (r.alunoId === alunoId ? { ...r, ...patch } : r)));
  }

  async function salvar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/aulas/${id}/presencas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          rows.map((r) => ({ alunoId: r.alunoId, status: r.status, justificativa: r.justificativa })),
        ),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Sucesso", description: "Chamada salva." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível salvar a chamada.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/diario"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chamada</h1>
          <p className="text-muted-foreground">
            {aula ? `${aula.turmaNome} · ${aula.disciplinaNome} · ${aula.data}` : "Carregando..."}
          </p>
        </div>
      </div>

      {aula && (
        <Card>
          <CardHeader><CardTitle>Conteúdo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{aula.conteudo}</p>
            {aula.observacoes && <p className="text-sm text-muted-foreground">{aula.observacoes}</p>}
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Presença</TableHead>
              <TableHead>Justificativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <TableRow key={r.alunoId}>
                  <TableCell className="font-medium">{r.alunoNome}</TableCell>
                  <TableCell>
                    <RadioGroup
                      className="flex gap-4"
                      value={r.status}
                      onValueChange={(v) => update(r.alunoId, { status: v })}
                    >
                      {STATUS.map((s) => (
                        <label key={s} className="flex items-center gap-1.5 text-sm capitalize cursor-pointer">
                          <RadioGroupItem value={s} /> {s}
                        </label>
                      ))}
                    </RadioGroup>
                  </TableCell>
                  <TableCell>
                    {r.status !== "presente" && (
                      <Input
                        placeholder="Justificativa"
                        value={r.justificativa ?? ""}
                        onChange={(e) => update(r.alunoId, { justificativa: e.target.value })}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                  Nenhum aluno ativo na turma.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving || rows.length === 0}>
          {saving ? "Salvando..." : "Salvar chamada"}
        </Button>
      </div>
    </div>
  );
}
