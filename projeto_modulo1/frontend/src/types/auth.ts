export interface UsuarioSessao {
  id: string;
  email: string;
  perfil: string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  usuario: UsuarioSessao;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CadastroRequest {
  email: string;
  senha: string;
}

/** Perfil de acesso (RBAC) — usado para popular o seletor do Administrador. */
export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string | null;
}

/** Usuário como exposto no painel do Administrador (GET /api/usuarios/). */
export interface Usuario {
  id: string;
  email: string;
  perfil: string | null;
  perfil_id: string | null;
  ativo: boolean;
  staff: boolean;
}

/** Payload de criação de usuário pelo Administrador. */
export interface NovoUsuario {
  email: string;
  senha: string;
  perfil?: string | null;
  ativo?: boolean;
  staff?: boolean;
}

/** Campos editáveis de um usuário pelo Administrador (todos opcionais). */
export interface PatchUsuario {
  email?: string;
  perfil?: string | null;
  ativo?: boolean;
  staff?: boolean;
}
