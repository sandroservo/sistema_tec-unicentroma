"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useListMatriculas, getListMatriculasQueryKey } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Trash2 } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Mat = {
  id: number;
  alunoId: number;
  alunoNome: string;
  turmaNome: string;
  cursoNome: string;
  status: string;
  dataMatricula: string;
  observacoes: string | null;
};

const STATUS = ["ativa", "trancada", "cancelada", "concluida"];

export default function MatriculasList() {
  const [status, setStatus] = useState<any>("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: matriculas, isLoading } = useListMatriculas({ status: status || undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(matriculas as Mat[] | undefined);

  const [ver, setVer] = useState<Mat | null>(null);
  const [editar, setEditar] = useState<Mat | null>(null);
  const [editStatus, setEditStatus] = useState("ativa");
  const [editObs, setEditObs] = useState("");
  const [saving, setSaving] = useState(false);

  function abrirEdicao(m: Mat) {
    setEditar(m);
    setEditStatus(m.status);
    setEditObs(m.observacoes ?? "");
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: getListMatriculasQueryKey() });

  async function salvar() {
    if (!editar) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/matriculas/${editar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, observacoes: editObs || null }),
      });
      if (!res.ok) throw new Error();
      invalidate();
      setEditar(null);
      toast({ title: "Matrícula atualizada" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: number) {
    const res = await fetch(`/api/matriculas/${id}`, { method: "DELETE" });
    if (res.ok) {
      invalidate();
      toast({ title: "Matrícula excluída", description: "A vaga foi devolvida à turma." });
    } else {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground">Vínculos de alunos com turmas.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="trancada">Trancada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma / Curso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando matrículas...</TableCell>
              </TableRow>
            ) : pageItems.length > 0 ? (
              pageItems.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell>{new Date(mat.dataMatricula).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Link href={`/alunos/${mat.alunoId}`} className="font-medium text-primary hover:underline">
                      {mat.alunoNome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{mat.turmaNome}</div>
                    <div className="text-xs text-muted-foreground">{mat.cursoNome}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mat.status === "ativa" ? "default" : mat.status === "concluida" ? "secondary" : "destructive"}>
                      {mat.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setVer(mat)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(mat)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir matrícula?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {mat.alunoNome} — {mat.turmaNome}. A vaga será devolvida à turma. Ação irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => excluir(mat.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma matrícula encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </div>

      {/* Visualizar */}
      <Dialog open={!!ver} onOpenChange={(o) => !o && setVer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da matrícula</DialogTitle></DialogHeader>
          {ver && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Aluno:</span> <span className="font-medium">{ver.alunoNome}</span></p>
              <p><span className="text-muted-foreground">Turma:</span> {ver.turmaNome} — {ver.cursoNome}</p>
              <p><span className="text-muted-foreground">Data:</span> {new Date(ver.dataMatricula).toLocaleDateString("pt-BR")}</p>
              <p><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{ver.status}</Badge></p>
              <p><span className="text-muted-foreground">Observações:</span> {ver.observacoes || "—"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar matrícula</DialogTitle></DialogHeader>
          {editar && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editar.alunoNome} — {editar.turmaNome}</p>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea value={editObs} onChange={(e) => setEditObs(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
