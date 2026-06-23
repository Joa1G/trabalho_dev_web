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
} from "@/api/usuarios";
import { listarPerfis } from "@/api/perfis";
import type { PerfilAcesso, Usuario } from "@/types/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const SEM_PERFIL = "__sem_perfil__";

type StatusLinha = "salvando" | "ok" | "erro" | undefined;

function msgErro(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    const data = e.response?.data as
      | { detail?: string; email?: string[] }
      | undefined;
    if (data?.detail) return data.detail;
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

  const [paraExcluir, setParaExcluir] = useState<Usuario | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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

  const filtrando = !!termo || !!filtroPerfil || !!filtroStatus;

  async function patchUsuario(u: Usuario, patch: Parameters<typeof atualizarUsuario>[1]) {
    setErro(null);
    setFeedback(null);
    setStatus((s) => ({ ...s, [u.id]: "salvando" }));
    try {
      const atualizado = await atualizarUsuario(u.id, patch);
      setUsuarios((us) => us.map((x) => (x.id === u.id ? atualizado : x)));
      setStatus((s) => ({ ...s, [u.id]: "ok" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [u.id]: "erro" }));
      setErro(msgErro(e, "Não foi possível salvar a alteração."));
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setErro(null);
    setFeedback(null);
    setExcluindo(true);
    try {
      await excluirUsuario(paraExcluir.id);
      setUsuarios((us) => us.filter((x) => x.id !== paraExcluir.id));
      setFeedback(`Usuário ${paraExcluir.email} excluído.`);
      setParaExcluir(null);
    } catch (e) {
      setErro(msgErro(e, "Não foi possível excluir o usuário."));
    } finally {
      setExcluindo(false);
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
            Crie, edite, ative/desative e atribua o perfil de acesso (RBAC) de
            cada usuário.
          </p>
        </div>
        <Button onClick={() => setMostrarForm((v) => !v)} className="shrink-0">
          {mostrarForm ? "Fechar" : "+ Novo usuário"}
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
          className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-ifam-preto">
            Novo usuário
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
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
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register("ativo")} /> Ativo
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register("staff")} /> Staff
                <span className="text-xs text-gray-400">(/admin)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMostrarForm(false)}
            >
              Cancelar
            </Button>
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

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Ativo</th>
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
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-ifam-preto">
                          {u.email}
                        </span>
                        {ehEu && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                            você
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.ativo}
                            disabled={salvando || ehEu}
                            onChange={(v) => patchUsuario(u, { ativo: v })}
                            label={`Ativar/desativar ${u.email}`}
                            title={
                              ehEu
                                ? "Você não pode desativar a própria conta"
                                : undefined
                            }
                          />
                          <span
                            className={`text-xs ${
                              u.ativo ? "text-primary-hover" : "text-gray-400"
                            }`}
                          >
                            {u.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={u.staff}
                          disabled={salvando}
                          onChange={(v) => patchUsuario(u, { staff: v })}
                          label={`Staff de ${u.email}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          aria-label={`Perfil de ${u.email}`}
                          value={u.perfil_id ?? SEM_PERFIL}
                          disabled={salvando}
                          className="w-40"
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
                      <td className="px-4 py-3 text-right">
                        {!ehEu && (
                          <Button
                            variant="ghost"
                            onClick={() => setParaExcluir(u)}
                            className="h-8 px-2 text-xs text-destructive hover:bg-destructive/5"
                          >
                            Excluir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      {filtrando
                        ? "Nenhum usuário encontrado para os filtros."
                        : "Nenhum usuário cadastrado."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={paraExcluir !== null}
        title="Excluir usuário"
        destructive
        confirmLabel="Excluir"
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setParaExcluir(null)}
        description={
          <>
            Tem certeza que deseja excluir{" "}
            <strong className="text-ifam-preto">{paraExcluir?.email}</strong>?
            Esta ação é irreversível.
          </>
        }
      />
    </div>
  );
}
