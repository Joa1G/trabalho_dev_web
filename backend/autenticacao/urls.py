from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CadastroView,
    LoginView,
    PerfilAcessoDeleteView,
    PerfilAcessoListCreateView,
    UsuarioDetailView,
    UsuarioListCreateView,
    UsuarioPerfilView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/cadastro/", CadastroView.as_view(), name="cadastro"),
    path("perfis/", PerfilAcessoListCreateView.as_view(), name="perfil-list"),
    path("perfis/<uuid:pk>/", PerfilAcessoDeleteView.as_view(), name="perfil-detail"),
    path("usuarios/", UsuarioListCreateView.as_view(), name="usuario-list"),
    path("usuarios/<uuid:pk>/", UsuarioDetailView.as_view(), name="usuario-detail"),
    path("usuarios/<uuid:pk>/perfil/", UsuarioPerfilView.as_view(), name="usuario-perfil"),
]
