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
