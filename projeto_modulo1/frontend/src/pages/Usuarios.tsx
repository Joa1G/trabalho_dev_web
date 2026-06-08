import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";

import {
  atualizarUsuario,
  criarUsuario,
  excluirUsuario,
  listarUsuarios,
  resetarSenha,
} from "@/api/usuarios";
import { listarPerfis } from "@/api/perfis";
import type { PerfilAcesso, Usuario } from "@/types/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const SEM_PERFIL = "__sem_perfil__";

type StatusLinha = "salvando" | "ok" | "erro" | undefined;

function msgErro(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as
      | { detail?: string; senha?: string[]; email?: string[] }
      | undefined;
    if (data?.detail) return data.detail;
    if (data?.senha?.[0]) return data.senha[0];
    if (data?.email?.[0]) return data.email[0];
  }
  return fallback;
}

const novoSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(8, "Mínimo de 8 caracteres"),
  perfil: z.string(),
  ativo: z.boolean(),
  staff: z.boolean(),
});
type NovoForm = z.infer<typeof novoSchema>;

export default function UsuariosPage() {
  const meuId = useAuthStore((s) => s.usuario?.id);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, StatusLinha>>({});

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NovoForm>({
    resolver: zodResolver(novoSchema),
    defaultValues: { email: "", senha: "", perfil: "", ativo: true, staff: false },
  });

  useEffect(() => {
    let ativo = true;
    Promise.all([listarUsuarios(), listarPerfis()])
      .then(([us, ps]) => {
        if (!ativo) return;
        setUsuarios(us);
        setPerfis(ps);
      })
      .catch(() => ativo && setErro("Não foi possível carregar os usuários."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const termo = busca.trim().toLowerCase();
  const usuariosFiltrados = usuarios.filter((u) => {
    if (
      termo &&
      !u.email.toLowerCase().includes(termo) &&
      !(u.perfil ?? "sem perfil").toLowerCase().includes(termo)
    ) {
      return false;
    }
    if (filtroPerfil === SEM_PERFIL && u.perfil_id) return false;
    if (filtroPerfil && filtroPerfil !== SEM_PERFIL && u.perfil_id !== filtroPerfil)
      return false;
    if (filtroStatus === "ativo" && !u.ativo) return false;
    if (filtroStatus === "inativo" && u.ativo) return false;
    return true;
  });

  function aplicarAtualizado(atualizado: Usuario) {
    setUsuarios((us) => us.map((x) => (x.id === atualizado.id ? atualizado : x)));
  }

  async function patchUsuario(u: Usuario, patch: Parameters<typeof atualizarUsuario>[1]) {
    setErro(null);
    setFeedback(null);
    setStatus((s) => ({ ...s, [u.id]: "salvando" }));
    try {
      aplicarAtualizado(await atualizarUsuario(u.id, patch));
      setStatus((s) => ({ ...s, [u.id]: "ok" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [u.id]: "erro" }));
      setErro(msgErro(e, "Não foi possível salvar a alteração."));
    }
  }

  async function onResetarSenha(u: Usuario) {
    const nova = window.prompt(`Nova senha para ${u.email} (mín. 8 caracteres):`);
    if (nova === null) return;
    setErro(null);
    setFeedback(null);
    try {
      await resetarSenha(u.id, nova);
      setFeedback(`Senha de ${u.email} redefinida.`);
    } catch (e) {
      setErro(msgErro(e, "Não foi possível redefinir a senha."));
    }
  }

  async function onExcluir(u: Usuario) {
    if (!window.confirm(`Excluir o usuário ${u.email}? Esta ação é irreversível.`))
      return;
    setErro(null);
    setFeedback(null);
    try {
      await excluirUsuario(u.id);
      setUsuarios((us) => us.filter((x) => x.id !== u.id));
      setFeedback(`Usuário ${u.email} excluído.`);
    } catch (e) {
      setErro(msgErro(e, "Não foi possível excluir o usuário."));
    }
  }

  async function onCriar(data: NovoForm) {
    setErro(null);
    setFeedback(null);
    try {
      const novo = await criarUsuario({
        email: data.email.trim(),
        senha: data.senha,
        perfil: data.perfil || null,
        ativo: data.ativo,
        staff: data.staff,
      });
      setUsuarios((us) =>
        [...us, novo].sort((a, b) => a.email.localeCompare(b.email)),
      );
      reset({ email: "", senha: "", perfil: "", ativo: true, staff: false });
      setMostrarForm(false);
      setFeedback(`Usuário ${novo.email} criado.`);
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 400) {
        const data400 = e.response.data as Record<string, string[]>;
        if (data400?.email) {
          setError("email", { message: data400.email[0] });
          return;
        }
        if (data400?.senha) {
          setError("senha", { message: data400.senha[0] });
          return;
        }
      }
      setErro(msgErro(e, "Não foi possível criar o usuário."));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ifam-preto">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crie, edite, ative/desative, redefina senha e atribua o perfil de
            acesso (RBAC) de cada usuário.
          </p>
        </div>
        <Button onClick={() => setMostrarForm((v) => !v)} className="shrink-0">
          {mostrarForm ? "Cancelar" : "Novo usuário"}
        </Button>
      </div>

      {erro && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {erro}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary-hover"
        >
          {feedback}
        </div>
      )}

      {/* Formulário de criação */}
      {mostrarForm && (
        <form
          noValidate
          onSubmit={handleSubmit(onCriar)}
          className="mb-6 grid gap-4 rounded-md border border-gray-200 bg-white p-5 sm:grid-cols-2"
        >
          <div className="space-y-1">
            <Label htmlFor="novo-email">E-mail</Label>
            <Input
              id="novo-email"
              type="email"
              placeholder="usuario@instituicao.edu.br"
              error={errors.email?.message}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="novo-senha">Senha</Label>
            <Input
              id="novo-senha"
              type="password"
              placeholder="mínimo de 8 caracteres"
              error={errors.senha?.message}
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-xs text-destructive">{errors.senha.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="novo-perfil">Perfil</Label>
            <Select id="novo-perfil" {...register("perfil")}>
              <option value="">— Sem perfil —</option>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register("ativo")} /> Ativo
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register("staff")} /> Staff (acesso ao
              /admin)
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={isSubmitting}>
              Criar usuário
            </Button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <>
          {/* Busca + filtros */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Input
              type="search"
              placeholder="Buscar por e-mail ou perfil..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar usuários"
              className="w-full max-w-xs"
            />
            <Select
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              aria-label="Filtrar por perfil"
              className="w-44"
            >
              <option value="">Todos os perfis</option>
              <option value={SEM_PERFIL}>Sem perfil</option>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              aria-label="Filtrar por status"
              className="w-36"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </Select>
            <span className="ml-auto whitespace-nowrap text-xs text-gray-400">
              {usuariosFiltrados.length} de {usuarios.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Perfil de acesso</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const ehEu = u.id === meuId;
                  const salvando = status[u.id] === "salvando";
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-3 text-ifam-preto">
                        {u.email}
                        {ehEu && (
                          <span className="ml-2 text-xs text-gray-400">(você)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={salvando || ehEu}
                          onClick={() => patchUsuario(u, { ativo: !u.ativo })}
                          title={
                            ehEu
                              ? "Você não pode desativar a própria conta"
                              : "Clique para alternar"
                          }
                          className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:cursor-not-allowed ${
                            u.ativo
                              ? "bg-primary/10 text-primary-hover"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {u.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={u.staff}
                          disabled={salvando}
                          onChange={(e) =>
                            patchUsuario(u, { staff: e.target.checked })
                          }
                          aria-label={`Staff de ${u.email}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          aria-label={`Perfil de ${u.email}`}
                          value={u.perfil_id ?? SEM_PERFIL}
                          disabled={salvando}
                          onChange={(e) =>
                            patchUsuario(u, {
                              perfil:
                                e.target.value === SEM_PERFIL
                                  ? null
                                  : e.target.value,
                            })
                          }
                        >
                          <option value={SEM_PERFIL}>— Sem perfil —</option>
                          {perfis.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => onResetarSenha(u)}
                            className="h-8 px-2 text-xs"
                          >
                            Senha
                          </Button>
                          {!ehEu && (
                            <Button
                              variant="ghost"
                              onClick={() => onExcluir(u)}
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/5"
                            >
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      {usuarios.length === 0
                        ? "Nenhum usuário cadastrado."
                        : "Nenhum usuário encontrado para os filtros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
