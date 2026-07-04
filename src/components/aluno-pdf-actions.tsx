"use client";

import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

export function AlunoPdfActions({ alunoId, turmaId }: { alunoId: number; turmaId?: number }) {
  const open = (url: string) => window.open(url, "_blank");
  const boletimUrl = `/api/pdf/boletim/${alunoId}${turmaId ? `?turmaId=${turmaId}` : ""}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => open(boletimUrl)}>
        <FileText className="w-4 h-4" /> Boletim
      </Button>
      <Button variant="outline" onClick={() => open(`/api/pdf/declaracao/${alunoId}`)}>
        <FileText className="w-4 h-4" /> Declaração de Matrícula
      </Button>
      <Button variant="outline" onClick={() => open(`/api/pdf/historico/${alunoId}`)}>
        <Download className="w-4 h-4" /> Histórico Escolar
      </Button>
    </div>
  );
}
