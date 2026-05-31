import { api } from "@/api/client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("api/auth/login/", body);
  return data;
}
