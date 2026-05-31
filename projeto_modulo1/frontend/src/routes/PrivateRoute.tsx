import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

interface PrivateRouteProps {
  children: ReactNode;
  /** Quando informado, gateia por papel (espelha o RBAC do backend). */
  perfis?: string[];
}

export function PrivateRoute({ children, perfis }: PrivateRouteProps) {
  const location = useLocation();
  const { isAuthenticated, usuario } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }
  if (perfis && perfis.length > 0) {
    if (!usuario?.perfil || !perfis.includes(usuario.perfil)) {
      return <Navigate to="/sem-permissao" replace />;
    }
  }
  return <>{children}</>;
}
