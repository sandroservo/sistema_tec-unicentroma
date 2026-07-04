"use client";

// Peças compartilhadas das páginas de relatórios (não é rota).

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportCsv } from "@/lib/csv";

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtData = (s: string | null) => (s ? s.split("-").reverse().join("/") : "—");

export const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
};

export const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
} as const;

export function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <h4 className="mt-1 text-2xl font-semibold tracking-tight">{value}</h4>
      </CardContent>
    </Card>
  );
}

/** Título + descrição + Exportar CSV/Imprimir. Exporta as linhas COMPLETAS. */
export function ReportHeader({
  titulo,
  descricao,
  csvName,
  rows,
}: {
  titulo: string;
  descricao: string;
  csvName: string;
  rows: Record<string, unknown>[] | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-muted-foreground">{descricao}</p>
      </div>
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" onClick={() => exportCsv(csvName, rows ?? [])} disabled={!rows?.length}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>
    </div>
  );
}

/** Toast padrão quando a query do relatório falha. */
export function useReportError(isError: boolean) {
  const { toast } = useToast();
  useEffect(() => {
    if (isError) toast({ title: "Erro ao carregar relatório", variant: "destructive" });
  }, [isError, toast]);
}
