import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { AxiosError } from "axios";

import { login } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Brand } from "@/components/Brand";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginStore = useAuthStore((s) => s.login);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setErroServidor(null);
    try {
      const resp = await login(data);
      loginStore(resp);
      const dest =
        (location.state as { from?: string } | null)?.from ?? "/";
      navigate(dest, { replace: true });
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 401) {
        setErroServidor("E-mail ou senha inválidos.");
      } else if (e instanceof AxiosError && e.response?.status === 400) {
        setErroServidor("Dados inválidos.");
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
          Acessar o sistema
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Entre com suas credenciais institucionais
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
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.senha?.message}
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-xs text-destructive">{errors.senha.message}</p>
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
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
