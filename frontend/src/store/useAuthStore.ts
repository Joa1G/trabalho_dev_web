import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LoginResponse, UsuarioSessao } from "@/types/auth";

interface AuthState {
  usuario: UsuarioSessao | null;
  access: string | null;
  refresh: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  setAccess: (access: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      access: null,
      refresh: null,
      isAuthenticated: false,
      login: (data) =>
        set({
          usuario: data.usuario,
          access: data.access,
          refresh: data.refresh,
          isAuthenticated: true,
        }),
      setAccess: (access) => set({ access }),
      logout: () =>
        set({
          usuario: null,
          access: null,
          refresh: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "modulo1-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
