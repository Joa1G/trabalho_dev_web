import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";

import { criarPerfil, excluirPerfil, listarPerfis } from "@/api/perfis";
import type { PerfilAcesso } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

/** Perfis padrão semeados no backend — não podem ser excluídos. */
const RESERVADOS = ["Administrador", "Professor", "Funcionario"];

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(50, "Máximo de 50 caracteres"),
  descricao: z.string().max(255, "Máximo de 255 caracteres").optional(),
});
type FormData = z.infer<typeof schema>;

export default function PerfisPage() {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let ativo = true;
    listarPerfis()
      .then((ps) => ativo && setPerfis(ps))
      .catch(() => ativo && setErro("Não foi possível carregar os perfis."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  async function onSubmit(data: FormData) {
    setFeedback(null);
    try {
      const novo = await criarPerfil({
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || undefined,
      });
      setPerfis((ps) =>
        [...ps, novo].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      reset({ nome: "", descricao: "" });
      setFeedback(`Perfil "${novo.nome}" criado.`);
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 400) {
        const dados = e.response.data as Record<string, string[] | string>;
        if (dados?.nome) {
          setError("nome", {
            message: Array.isArray(dados.nome) ? dados.nome[0] : dados.nome,
          });
          return;
        }
      }
      setError("nome", { message: "Não foi possível criar o perfil." });
    }
  }

  async function onExcluir(perfil: PerfilAcesso) {
    if (!window.confirm(`Excluir o perfil "${perfil.nome}"?`)) return;
    setErro(null);
    setFeedback(null);
    setExcluindo(perfil.id);
    try {
      await excluirPerfil(perfil.id);
      setPerfis((ps) => ps.filter((p) => p.id !== perfil.id));
      setFeedback(`Perfil "${perfil.nome}" excluído.`);
    } catch (e) {
      if (e instanceof AxiosError && (e.response?.status === 409 || e.response?.status === 400)) {
        const detail = (e.response.data as { detail?: string })?.detail;
        setErro(detail ?? "Não foi possível excluir este perfil.");
      } else {
        setErro("Não foi possível excluir este perfil.");
      }
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ifam-preto">
          Perfis de acesso
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Crie e gerencie os perfis (papéis) do RBAC. Perfis padrão do sistema e
          perfis com usuários vinculados não podem ser excluídos.
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
      {feedback && (
        <div
          role="status"
          className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary-hover"
        >
          {feedback}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Formulário de criação */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="h-fit space-y-4 rounded-md border border-gray-200 bg-white p-5"
        >
          <h2 className="text-sm font-semibold text-ifam-preto">Novo perfil</h2>
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex.: Coordenador"
              error={errors.nome?.message}
              {...register("nome")}
            />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input
              id="descricao"
              placeholder="Detalhe das permissões"
              error={errors.descricao?.message}
              {...register("descricao")}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">
                {errors.descricao.message}
              </p>
            )}
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Criar perfil
          </Button>
        </form>

        {/* Tabela de perfis existentes */}
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {carregando ? (
            <p className="px-4 py-6 text-sm text-gray-500">Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {perfis.map((p) => {
                  const reservado = RESERVADOS.includes(p.nome);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 last:border-0 align-top"
                    >
                      <td className="px-4 py-3 font-medium text-ifam-preto">
                        {p.nome}
                        {reservado && (
                          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                            padrão
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.descricao || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!reservado && (
                          <Button
                            variant="ghost"
                            onClick={() => onExcluir(p)}
                            loading={excluindo === p.id}
                            className="h-8 px-2 text-destructive hover:bg-destructive/5"
                          >
                            Excluir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {perfis.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      Nenhum perfil cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
