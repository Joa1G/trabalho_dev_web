import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";

export default function AppLayout() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();

  function sair() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Brand size="sm" />
            <span
              aria-hidden
              className="h-7 w-px bg-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Alocação de Recursos Didáticos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? "bg-primary/10 text-primary-hover"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                Início
              </NavLink>
              {usuario?.perfil === "Administrador" && (
                <>
                  <NavLink
                    to="/usuarios"
                    className={({ isActive }) =>
                      `rounded-md px-3 py-1.5 text-sm font-medium ${
                        isActive
                          ? "bg-primary/10 text-primary-hover"
                          : "text-gray-600 hover:bg-gray-100"
                      }`
                    }
                  >
                    Usuários
                  </NavLink>
                  <NavLink
                    to="/perfis"
                    className={({ isActive }) =>
                      `rounded-md px-3 py-1.5 text-sm font-medium ${
                        isActive
                          ? "bg-primary/10 text-primary-hover"
                          : "text-gray-600 hover:bg-gray-100"
                      }`
                    }
                  >
                    Perfis
                  </NavLink>
                </>
              )}
            </nav>
            <span aria-hidden className="h-7 w-px bg-gray-300" />
            <div className="text-right text-sm">
              <div className="font-medium text-ifam-preto">{usuario?.email}</div>
              <div className="text-xs text-gray-500">{usuario?.perfil}</div>
            </div>
            <Button variant="ghost" onClick={sair}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
