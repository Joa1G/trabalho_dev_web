from rest_framework.permissions import BasePermission


class TemPerfil(BasePermission):
    """RBAC central reutilizado por todos os RFs do módulo."""

    perfis_permitidos: list[str] = []

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.perfil_id is not None
            and user.perfil.nome in self.perfis_permitidos
        )


class IsAdministrador(TemPerfil):
    perfis_permitidos = ["Administrador"]


class IsProfessor(TemPerfil):
    perfis_permitidos = ["Professor"]


class IsFuncionario(TemPerfil):
    perfis_permitidos = ["Funcionario"]


def perfis_requeridos(*nomes):
    class _Perm(TemPerfil):
        perfis_permitidos = list(nomes)

    return _Perm
