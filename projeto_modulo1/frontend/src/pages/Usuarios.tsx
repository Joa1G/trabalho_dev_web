import { useEffect, useState } from "react";

import { atribuirPerfil, listarPerfis, listarUsuarios } from "@/api/usuarios";
import type { PerfilAcesso, Usuario } from "@/types/auth";
import { Select } from "@/components/ui/Select";

const SEM_PERFIL = "__sem_perfil__";

type StatusLinha = "salvando" | "ok" | "erro" | undefined;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, StatusLinha>>({});

  useEffect(() => {
    Promise.all([listarUsuarios(), listarPerfis()])
      .then(([us, ps]) => {
        setUsuarios(us);
        setPerfis(ps);
      })
      .catch(() => setErro("Não foi possível carregar os usuários."))
      .finally(() => setCarregando(false));
  }, []);

  async function onMudarPerfil(usuario: Usuario, valor: string) {
    const perfilId = valor === SEM_PERFIL ? null : valor;
    setStatus((s) => ({ ...s, [usuario.id]: "salvando" }));
    try {
      const atualizado = await atribuirPerfil(usuario.id, perfilId);
      setUsuarios((us) =>
        us.map((u) => (u.id === usuario.id ? atualizado : u)),
      );
      setStatus((s) => ({ ...s, [usuario.id]: "ok" }));
    } catch {
      setStatus((s) => ({ ...s, [usuario.id]: "erro" }));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ifam-preto">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Atribua o perfil de acesso (RBAC) de cada usuário. Usuários recém-
          cadastrados começam sem perfil até serem atribuídos aqui.
        </p>
      </div>

      {erro && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Perfil de acesso</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-ifam-preto">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.ativo
                          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-hover"
                          : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
                      }
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      aria-label={`Perfil de ${u.email}`}
                      value={u.perfil_id ?? SEM_PERFIL}
                      disabled={status[u.id] === "salvando"}
                      onChange={(e) => onMudarPerfil(u, e.target.value)}
                    >
                      <option value={SEM_PERFIL}>— Sem perfil —</option>
                      {perfis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {status[u.id] === "salvando" && (
                      <span className="text-gray-400">Salvando...</span>
                    )}
                    {status[u.id] === "ok" && (
                      <span className="text-primary-hover">Salvo ✓</span>
                    )}
                    {status[u.id] === "erro" && (
                      <span className="text-destructive">Falhou</span>
                    )}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-400"
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
