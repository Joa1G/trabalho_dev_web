from django.db.models import ProtectedError
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import PerfilAcesso, Usuario
from .permissions import IsAdministrador

# Perfis semeados pela migration 0002, consumidos pelas permission classes
# (IsAdministrador/IsProfessor/IsFuncionario). Não podem ser excluídos pela API.
PERFIS_RESERVADOS = {"Administrador", "Professor", "Funcionario"}
from .serializers import (
    AtribuirPerfilSerializer,
    CadastroSerializer,
    LoginSerializer,
    PerfilAcessoSerializer,
    SenhaResetSerializer,
    UsuarioCreateSerializer,
    UsuarioSerializer,
    UsuarioUpdateSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class CadastroView(generics.CreateAPIView):
    """POST /api/auth/cadastro/ — auto-cadastro público (perfil fica nulo)."""

    serializer_class = CadastroSerializer
    permission_classes = [AllowAny]


class PerfilAcessoListCreateView(generics.ListCreateAPIView):
    """GET  /api/perfis/ — lista os perfis disponíveis.
    POST /api/perfis/ — cria um novo perfil de acesso (Administrador)."""

    queryset = PerfilAcesso.objects.order_by("nome")
    serializer_class = PerfilAcessoSerializer
    permission_classes = [IsAdministrador]


class PerfilAcessoDeleteView(generics.DestroyAPIView):
    """DELETE /api/perfis/<id>/ — exclui um perfil (Administrador).

    Bloqueia a exclusão dos perfis reservados e dos perfis com usuários
    vinculados (RN nº3, via PROTECT)."""

    queryset = PerfilAcesso.objects.all()
    serializer_class = PerfilAcessoSerializer
    permission_classes = [IsAdministrador]

    def destroy(self, request, *args, **kwargs):
        perfil = self.get_object()
        if perfil.nome in PERFIS_RESERVADOS:
            return Response(
                {"detail": "Os perfis padrão do sistema não podem ser excluídos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            perfil.delete()
        except ProtectedError:
            return Response(
                {"detail": "Não é possível excluir um perfil com usuários vinculados."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UsuarioListCreateView(generics.ListCreateAPIView):
    """GET  /api/usuarios/ — lista os usuários (Administrador).
    POST /api/usuarios/ — cria um usuário com e-mail/senha/perfil/flags."""

    queryset = Usuario.objects.select_related("perfil").order_by("email")
    permission_classes = [IsAdministrador]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UsuarioCreateSerializer
        return UsuarioSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)


class UsuarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/usuarios/<id>/ — detalhe, edição e exclusão (Administrador).

    Salvaguardas: o Administrador não pode desativar nem excluir a própria conta
    (evita auto-bloqueio)."""

    queryset = Usuario.objects.select_related("perfil")
    permission_classes = [IsAdministrador]
    http_method_names = ["get", "patch", "delete", "options"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UsuarioUpdateSerializer
        return UsuarioSerializer

    def patch(self, request, *args, **kwargs):
        usuario = self.get_object()
        if usuario.pk == request.user.pk and request.data.get("ativo") is False:
            return Response(
                {"detail": "Você não pode desativar a própria conta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(usuario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        usuario.refresh_from_db()
        return Response(UsuarioSerializer(usuario).data)

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            return Response(
                {"detail": "Você não pode excluir a própria conta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UsuarioSenhaView(generics.GenericAPIView):
    """POST /api/usuarios/<id>/senha/ — Administrador redefine a senha do usuário."""

    queryset = Usuario.objects.all()
    serializer_class = SenhaResetSerializer
    permission_classes = [IsAdministrador]

    def post(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario.set_password(serializer.validated_data["senha"])
        usuario.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class UsuarioPerfilView(generics.UpdateAPIView):
    """PATCH /api/usuarios/<id>/perfil/ — Administrador atribui/remove o perfil."""

    queryset = Usuario.objects.select_related("perfil")
    serializer_class = AtribuirPerfilSerializer
    permission_classes = [IsAdministrador]
    http_method_names = ["patch", "options"]

    def patch(self, request, *args, **kwargs):
        usuario = self.get_object()
        serializer = self.get_serializer(usuario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        usuario.refresh_from_db()
        return Response(UsuarioSerializer(usuario).data)
