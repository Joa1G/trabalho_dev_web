import { api } from "@/api/client";
import type { NovoUsuario, PatchUsuario, Usuario } from "@/types/auth";

/** Lista todos os usuários (somente Administrador). */
export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>("api/usuarios/");
  return data;
}

/** Cria um usuário (e-mail/senha/perfil/flags) — somente Administrador. */
export async function criarUsuario(body: NovoUsuario): Promise<Usuario> {
  const { data } = await api.post<Usuario>("api/usuarios/", body);
  return data;
}

/** Atualiza campos de um usuário (e-mail, perfil, ativo, staff). */
export async function atualizarUsuario(
  usuarioId: string,
  patch: PatchUsuario,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`api/usuarios/${usuarioId}/`, patch);
  return data;
}

/** Redefine a senha de um usuário — somente Administrador. */
export async function resetarSenha(
  usuarioId: string,
  senha: string,
): Promise<void> {
  await api.post(`api/usuarios/${usuarioId}/senha/`, { senha });
}

/** Exclui um usuário — somente Administrador. */
export async function excluirUsuario(usuarioId: string): Promise<void> {
  await api.delete(`api/usuarios/${usuarioId}/`);
}
