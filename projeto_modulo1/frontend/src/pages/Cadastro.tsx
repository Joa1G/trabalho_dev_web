import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { AxiosError } from "axios";

import { cadastrar } from "@/api/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Brand } from "@/components/Brand";

const schema = z
  .object({
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });
type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const navigate = useNavigate();
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErroServidor(null);
    try {
      await cadastrar({ email: data.email, senha: data.senha });
      navigate("/login", {
        replace: true,
        state: {
          sucesso:
            "Cadastro realizado! Faça login. Um administrador definirá seu perfil de acesso.",
        },
      });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 400) {
        const dados = e.response.data as Record<string, string[] | string>;
        if (dados?.email) {
          setError("email", {
            message: Array.isArray(dados.email) ? dados.email[0] : dados.email,
          });
        } else if (dados?.senha) {
          setError("senha", {
            message: Array.isArray(dados.senha) ? dados.senha[0] : dados.senha,
          });
        } else {
          setErroServidor("Dados inválidos. Verifique os campos.");
        }
      } else {
        setErroServidor("Não foi possível conectar ao servidor.");
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Brand size="md" />
          <p className="text-sm font-medium text-gray-600">
            Alocação de Recursos Didáticos
          </p>
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-ifam-preto">
          Criar conta
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Cadastre-se com seu e-mail institucional
        </p>

        <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="seu.email@instituicao.edu.br"
              error={errors.email?.message}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              placeholder="mínimo de 8 caracteres"
              error={errors.senha?.message}
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-xs text-destructive">{errors.senha.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmarSenha?.message}
              {...register("confirmarSenha")}
            />
            {errors.confirmarSenha && (
              <p className="text-xs text-destructive">
                {errors.confirmarSenha.message}
              </p>
            )}
          </div>

          {erroServidor && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {erroServidor}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Cadastrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
