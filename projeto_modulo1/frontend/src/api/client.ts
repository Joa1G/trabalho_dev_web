import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const baseURL = import.meta.env.VITE_API_URL ?? "/";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = useAuthStore.getState().access;
  if (access) {
    config.headers.set("Authorization", `Bearer ${access}`);
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function tentarRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const { refresh, setAccess, logout } = useAuthStore.getState();
  if (!refresh) return null;

  refreshPromise = axios
    .post(`${baseURL}api/auth/refresh/`, { refresh })
    .then((r) => {
      const novo = r.data.access as string;
      setAccess(novo);
      return novo;
    })
    .catch(() => {
      logout();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // não tenta refresh nos próprios endpoints de auth
    const url = original?.url ?? "";
    const ehEndpointAuth = url.includes("/api/auth/");

    if (status === 401 && original && !original._retry && !ehEndpointAuth) {
      original._retry = true;
      const novo = await tentarRefresh();
      if (novo) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)["Authorization"] =
          `Bearer ${novo}`;
        return api.request(original);
      }
      // refresh falhou — logout já foi chamado em tentarRefresh
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
