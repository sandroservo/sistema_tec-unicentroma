// TODO: link no layout do portal do aluno
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Ocorrencia = { tipo: string; gravidade: string; descricao: string; data: string | null };

const tipoBadge = (t: string): { variant: "default" | "secondary" | "destructive" | "outline"; className?: string } => {
  if (t === "elogio") return { variant: "outline", className: "border-green-500 text-green-600" };
  if (t === "observacao") return { variant: "secondary" };
  if (t === "advertencia") return { variant: "outline", className: "border-amber-500 text-amber-600" };
  if (t === "suspensao") return { variant: "destructive" };
  return { variant: "default" };
};
const gravidadeVariant = (g: string): "default" | "secondary" | "destructive" =>
  g === "baixa" ? "secondary" : g === "alta" ? "destructive" : "default";

export default function PortalOcorrenciasPage() {
  const { data, isLoading } = useQuery<Ocorrencia[]>({
    queryKey: ["portal-ocorrencias"],
    queryFn: () => fetch("/api/portal/aluno/ocorrencias").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ocorrências</h1>
        <p className="text-muted-foreground">Registro disciplinar.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((o, i) => {
                const tb = tipoBadge(o.tipo);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant={tb.variant} className={`capitalize ${tb.className ?? ""}`}>
                        {o.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gravidadeVariant(o.gravidade)} className="capitalize">
                        {o.gravidade}
                      </Badge>
                    </TableCell>
                    <TableCell>{o.descricao}</TableCell>
                    <TableCell className="tabular-nums">{o.data}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhuma ocorrência registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
