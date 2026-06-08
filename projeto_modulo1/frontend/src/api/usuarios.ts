import { api } from "@/api/client";
import type { PerfilAcesso, Usuario } from "@/types/auth";

/** Lista todos os usuários (somente Administrador). */
export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>("api/usuarios/");
  return data;
}

/** Lista os perfis de acesso disponíveis (somente Administrador). */
export async function listarPerfis(): Promise<PerfilAcesso[]> {
  const { data } = await api.get<PerfilAcesso[]>("api/perfis/");
  return data;
}

/** Atribui (ou remove, com `null`) o perfil de um usuário. */
export async function atribuirPerfil(
  usuarioId: string,
  perfilId: string | null,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(
    `api/usuarios/${usuarioId}/perfil/`,
    { perfil: perfilId },
  );
  return data;
}
