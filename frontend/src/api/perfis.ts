import { api } from "@/api/client";
import type { PerfilAcesso } from "@/types/auth";

/** Lista os perfis de acesso (somente Administrador). */
export async function listarPerfis(): Promise<PerfilAcesso[]> {
  const { data } = await api.get<PerfilAcesso[]>("api/perfis/");
  return data;
}

/** Cria um novo perfil de acesso (somente Administrador). */
export async function criarPerfil(body: {
  nome: string;
  descricao?: string;
}): Promise<PerfilAcesso> {
  const { data } = await api.post<PerfilAcesso>("api/perfis/", body);
  return data;
}

/** Exclui um perfil de acesso (somente Administrador). */
export async function excluirPerfil(id: string): Promise<void> {
  await api.delete(`api/perfis/${id}/`);
}
