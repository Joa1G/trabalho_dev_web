from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CadastroView,
    LoginView,
    PerfilAcessoListView,
    UsuarioListView,
    UsuarioPerfilView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/cadastro/", CadastroView.as_view(), name="cadastro"),
    path("perfis/", PerfilAcessoListView.as_view(), name="perfil-list"),
    path("usuarios/", UsuarioListView.as_view(), name="usuario-list"),
    path("usuarios/<uuid:pk>/perfil/", UsuarioPerfilView.as_view(), name="usuario-perfil"),
]
