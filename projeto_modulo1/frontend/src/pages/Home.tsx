import { useAuthStore } from "@/store/useAuthStore";

export default function HomePage() {
  const usuario = useAuthStore((s) => s.usuario);
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ifam-preto">
        Bem-vindo, {usuario?.email}
      </h1>
      <p className="mt-2 text-gray-600">
        Sessão autenticada com perfil <strong>{usuario?.perfil}</strong>.
      </p>
      <div className="mt-6 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p className="font-medium">RF-01 — Autenticação e Controle de Acesso</p>
        <p className="mt-1 text-gray-500">
          Esta é a base que os demais RFs do Módulo 1 vão consumir. As telas
          específicas (reservas, inventário, manutenção) serão entregues pelos
          colegas e plugadas a partir daqui.
        </p>
      </div>
    </div>
  );
}
