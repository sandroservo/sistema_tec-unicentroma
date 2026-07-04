"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: number;
  titulo: string;
  tipo: string;
  dataInicio: string | null;
  dataFim: string | null;
  descricao: string | null;
};

// tipo do evento → cor (nível TailAdmin) + rótulo PT.
const TIPOS: { value: string; label: string; cor: "primary" | "danger" | "success" | "warning" }[] = [
  { value: "feriado", label: "Feriado", cor: "danger" },
  { value: "prova", label: "Prova", cor: "warning" },
  { value: "recesso", label: "Recesso", cor: "success" },
  { value: "evento", label: "Evento", cor: "primary" },
  { value: "conselho", label: "Conselho de Classe", cor: "primary" },
  { value: "formatura", label: "Formatura", cor: "success" },
  { value: "inicio_semestre", label: "Início de Semestre", cor: "primary" },
  { value: "fim_semestre", label: "Fim de Semestre", cor: "warning" },
];
const corDoTipo = (tipo: string) => TIPOS.find((t) => t.value === tipo)?.cor ?? "primary";

type FormState = {
  id: number | null;
  titulo: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
};

const VAZIO: FormState = { id: null, titulo: "", tipo: "evento", dataInicio: "", dataFim: "", descricao: "" };

export default function CalendarioPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const calRef = useRef<FullCalendar>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(VAZIO);

  const { data: eventos } = useQuery<Evento[]>({
    queryKey: ["calendario"],
    queryFn: async () => {
      const res = await fetch("/api/calendario");
      if (!res.ok) throw new Error("Erro ao buscar eventos");
      return res.json();
    },
  });

  const fcEvents: EventInput[] = (eventos ?? []).map((ev) => ({
    id: String(ev.id),
    title: ev.titulo,
    start: ev.dataInicio ?? undefined,
    // FullCalendar trata `end` como exclusivo; +1 dia p/ eventos de dia inteiro cobrirem o dia final.
    end: ev.dataFim ? somaDia(ev.dataFim) : undefined,
    allDay: true,
    extendedProps: { tipo: ev.tipo, descricao: ev.descricao },
    classNames: ["event-fc-color", `fc-bg-${corDoTipo(ev.tipo)}`],
  }));

  function abrirNovo(data?: string) {
    setForm({ ...VAZIO, dataInicio: data ?? "" });
    setOpen(true);
  }

  function abrirEdicao(ev: Evento) {
    setForm({
      id: ev.id,
      titulo: ev.titulo,
      tipo: ev.tipo,
      dataInicio: ev.dataInicio ?? "",
      dataFim: ev.dataFim ?? "",
      descricao: ev.descricao ?? "",
    });
    setOpen(true);
  }

  const salvar = useMutation({
    mutationFn: async (f: FormState) => {
      const body = {
        titulo: f.titulo,
        tipo: f.tipo,
        dataInicio: f.dataInicio,
        dataFim: f.dataFim || null,
        descricao: f.descricao || null,
      };
      const res = await fetch(f.id ? `/api/calendario/${f.id}` : "/api/calendario", {
        method: f.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao salvar evento");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario"] });
      setOpen(false);
      toast({ title: "Sucesso", description: "Evento salvo." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" }),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/calendario/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario"] });
      setOpen(false);
      toast({ title: "Sucesso", description: "Evento excluído." });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendário Acadêmico</h1>
        <p className="text-muted-foreground">Feriados, provas, eventos e datas importantes.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="pt-br"
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          customButtons={{
            addEventButton: { text: "Novo evento +", click: () => abrirNovo() },
          }}
          events={fcEvents}
          selectable
          dateClick={(arg: DateClickArg) => abrirNovo(arg.dateStr)}
          eventClick={(arg: EventClickArg) => {
            const ev = eventos?.find((e) => String(e.id) === arg.event.id);
            if (ev) abrirEdicao(ev);
          }}
          height="auto"
          dayMaxEvents={3}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>Agende ou edite uma data do calendário acadêmico.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>Título do evento</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Prova bimestral"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo / cor</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => {
                  const ativo = form.tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t.value })}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        ativo ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${dotClass(t.cor)}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de início</Label>
                <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de fim (opcional)</Label>
                <Input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes do evento"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {form.id ? (
              <Button variant="outline" className="text-destructive" onClick={() => excluir.mutate(form.id!)} disabled={excluir.isPending}>
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => salvar.mutate(form)}
                disabled={salvar.isPending || !form.titulo || !form.dataInicio}
              >
                {form.id ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function somaDia(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dotClass(cor: "primary" | "danger" | "success" | "warning"): string {
  return {
    primary: "bg-primary",
    danger: "bg-destructive",
    success: "bg-[hsl(var(--chart-3))]",
    warning: "bg-[hsl(var(--chart-4))]",
  }[cor];
}
