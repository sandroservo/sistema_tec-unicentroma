"use client";

import { useListCertificados } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CertificadosList() {
  const { data: certificados, isLoading } = useListCertificados({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">Controle de certificados emitidos.</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Emitir Certificado
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Data de Emissão</TableHead>
              <TableHead className="text-right">Carga Horária</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando certificados...</TableCell>
              </TableRow>
            ) : certificados && certificados.length > 0 ? (
              certificados.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell className="font-mono text-sm">{cert.codigo}</TableCell>
                  <TableCell>
                    <Link href={`/alunos/${cert.alunoId}`} className="font-medium text-primary hover:underline">
                      {cert.alunoNome}
                    </Link>
                  </TableCell>
                  <TableCell>{cert.cursoNome}</TableCell>
                  <TableCell>
                    {new Date(cert.dataEmissao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">{cert.cargaHoraria}h</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum certificado emitido.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
