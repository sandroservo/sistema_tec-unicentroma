// Helper client para o proxy ViaCEP (/api/cep/<cep>). Sem React.
export type Endereco = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

/** Busca endereço por CEP. Lança em erro (rede, não encontrado, etc.). */
export async function buscarCep(cep: string): Promise<Endereco> {
  const digitos = cep.replace(/\D/g, "");
  const res = await fetch(`/api/cep/${digitos}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Erro ao buscar CEP");
  }
  return res.json();
}
