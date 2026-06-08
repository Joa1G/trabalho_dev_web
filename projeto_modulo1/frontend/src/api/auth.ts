import { api } from "@/api/client";
import type {
  CadastroRequest,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("api/auth/login/", body);
  return data;
}

/** Auto-cadastro público. O usuário nasce sem perfil; o admin atribui depois. */
export async function cadastrar(body: CadastroRequest): Promise<void> {
  await api.post("api/auth/cadastro/", body);
}
