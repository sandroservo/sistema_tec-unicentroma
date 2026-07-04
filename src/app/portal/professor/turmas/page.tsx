"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Turma = {
  id: number;
  nome: string;
  cursoNome: string;
  totalAlunos: number;
  status: string;
  dataInicio: string | null;
};

export default function MinhasTurmas() {
  const { data, isLoading } = useQuery<Turma[]>({
    queryKey: ["portal-prof-turmas"],
    queryFn: () => fetch("/api/portal/professor/turmas").then((r) => r.json()),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas Turmas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="text-right">Alunos</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/portal/professor/turma/${t.id}`} className="font-medium hover:underline">
                      {t.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{t.cursoNome}</TableCell>
                  <TableCell>{t.dataInicio ?? "–"}</TableCell>
                  <TableCell className="text-right">{t.totalAlunos}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nenhuma turma vinculada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
