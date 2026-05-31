import { Link } from "react-router-dom";

export default function SemPermissaoPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-semibold text-destructive">
        Acesso negado
      </h1>
      <p className="mt-2 text-gray-600">
        Seu perfil não tem permissão para acessar esta página.
      </p>
      <Link to="/" className="mt-6 inline-block text-primary hover:underline">
        Voltar à página inicial
      </Link>
    </div>
  );
}
