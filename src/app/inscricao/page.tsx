"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";

type Processo = {
  id: number;
  nome: string;
  descricao: string | null;
  vagas: number;
  inscricaoFim: string | null;
  taxaInscricao: number;
};
type Comprovante = { protocolo: number; nome: string; processo: string };

const schema = z.object({
  processoId: z.coerce.number().int().min(1, "Selecione um processo"),
  nome: z.string().min(2, "Informe seu nome completo"),
  cpf: z.string().min(11, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function InscricaoPublica() {
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);

  const { data } = useQuery({
    queryKey: ["inscricao-processos"],
    queryFn: async (): Promise<{ data: Processo[] }> => {
      const res = await fetch("/api/inscricao/processos");
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const inscrever = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro");
      return json.comprovante as Comprovante;
    },
    onSuccess: (c) => setComprovante(c),
  });

  const processos = data?.data ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f7", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#1e293b", color: "#fff", padding: "16px 24px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>ERP Escola — Inscrições</h1>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
        {comprovante ? (
          <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Comprovante de inscrição</h2>
            <p>Sua inscrição foi registrada com sucesso.</p>
            <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0" }}>
              <tbody>
                <tr><td style={{ padding: 6, color: "#555" }}>Protocolo</td><td style={{ padding: 6, fontWeight: 700 }}>#{comprovante.protocolo}</td></tr>
                <tr><td style={{ padding: 6, color: "#555" }}>Nome</td><td style={{ padding: 6 }}>{comprovante.nome}</td></tr>
                <tr><td style={{ padding: 6, color: "#555" }}>Processo</td><td style={{ padding: 6 }}>{comprovante.processo}</td></tr>
              </tbody>
            </table>
            <button onClick={() => window.print()} style={btnStyle}>Imprimir</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit((v) => inscrever.mutate(v))} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 24, display: "grid", gap: 16 }}>
            <h2 style={{ margin: 0 }}>Faça sua inscrição</h2>

            <label style={labelStyle}>
              Processo seletivo
              <select {...register("processoId")} style={inputStyle} defaultValue="">
                <option value="" disabled>Selecione...</option>
                {processos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.vagas} vagas · até {p.inscricaoFim} · taxa R$ {p.taxaInscricao.toFixed(2)}
                  </option>
                ))}
              </select>
              {errors.processoId && <span style={errStyle}>{errors.processoId.message}</span>}
            </label>

            <label style={labelStyle}>
              Nome completo
              <input {...register("nome")} style={inputStyle} />
              {errors.nome && <span style={errStyle}>{errors.nome.message}</span>}
            </label>

            <label style={labelStyle}>
              CPF
              <input {...register("cpf")} style={inputStyle} placeholder="000.000.000-00" />
              {errors.cpf && <span style={errStyle}>{errors.cpf.message}</span>}
            </label>

            <label style={labelStyle}>
              E-mail
              <input {...register("email")} style={inputStyle} type="email" />
              {errors.email && <span style={errStyle}>{errors.email.message}</span>}
            </label>

            <label style={labelStyle}>
              Telefone
              <input {...register("telefone")} style={inputStyle} placeholder="(00) 00000-0000" />
            </label>

            {inscrever.isError && <span style={errStyle}>{(inscrever.error as Error).message}</span>}

            <button type="submit" disabled={inscrever.isPending} style={btnStyle}>
              {inscrever.isPending ? "Enviando..." : "Enviar inscrição"}
            </button>
            {processos.length === 0 && <p style={{ color: "#777", fontSize: 14 }}>Nenhum processo com inscrições abertas no momento.</p>}
          </form>
        )}
      </main>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "grid", gap: 4, fontSize: 14, fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontWeight: 400 };
const btnStyle: React.CSSProperties = { padding: "10px 16px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" };
const errStyle: React.CSSProperties = { color: "#dc2626", fontSize: 12, fontWeight: 400 };
