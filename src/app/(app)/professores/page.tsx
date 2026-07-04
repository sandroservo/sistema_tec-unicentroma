"use client";

import { useState } from "react";
import Link from "next/link";
import { useListProfessores } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

export default function ProfessoresList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<any>("");

  const { data: professores, isLoading } = useListProfessores({ search: search || undefined, status: status || undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(professores);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Professores</h1>
          <p className="text-muted-foreground">Corpo docente da instituição.</p>
        </div>
        <Button asChild>
          <Link href="/professores/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Professor
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Titulação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando professores...</TableCell>
              </TableRow>
            ) : professores && professores.length > 0 ? (
              pageItems.map((prof) => (
                <TableRow key={prof.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{prof.nome}</span>
                      <span className="text-xs text-muted-foreground">{prof.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{prof.especialidade || "-"}</TableCell>
                  <TableCell>
                    {prof.titulacao && (
                      <Badge variant="outline" className="capitalize">
                        {prof.titulacao}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={prof.status === 'ativo' ? 'default' : 'secondary'}>
                      {prof.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum professor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </div>
    </div>
  );
}
