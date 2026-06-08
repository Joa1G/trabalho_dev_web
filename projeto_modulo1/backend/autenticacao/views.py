from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import PerfilAcesso, Usuario
from .permissions import IsAdministrador
from .serializers import (
    AtribuirPerfilSerializer,
    CadastroSerializer,
    LoginSerializer,
    PerfilAcessoSerializer,
    UsuarioSerializer,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class CadastroView(generics.CreateAPIView):
    """POST /api/auth/cadastro/ — auto-cadastro público (perfil fica nulo)."""

    serializer_class = CadastroSerializer
    permission_classes = [AllowAny]


class PerfilAcessoListView(generics.ListAPIView):
    """GET /api/perfis/ — lista os perfis disponíveis (popula o seletor do admin)."""

    queryset = PerfilAcesso.objects.order_by("nome")
    serializer_class = PerfilAcessoSerializer
    permission_classes = [IsAdministrador]


class UsuarioListView(generics.ListAPIView):
    """GET /api/usuarios/ — lista os usuários para o painel do Administrador."""

    queryset = Usuario.objects.select_related("perfil").order_by("email")
    serializer_class = UsuarioSerializer
    permission_classes = [IsAdministrador]


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
