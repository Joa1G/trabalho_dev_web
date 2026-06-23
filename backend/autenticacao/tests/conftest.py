import pytest
from rest_framework.test import APIClient

from autenticacao.models import PerfilAcesso

SENHA = "senha_super_segura_123"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def perfis(db):
    # a migration de seed cria os 3 perfis; get_or_create por robustez
    return {
        nome: PerfilAcesso.objects.get_or_create(nome=nome)[0]
        for nome in ("Administrador", "Professor", "Funcionario")
    }


@pytest.fixture
def professor(db, perfis, django_user_model):
    return django_user_model.objects.create_user(
        email="prof@inst.edu.br",
        password=SENHA,
        perfil=perfis["Professor"],
    )


@pytest.fixture
def administrador(db, perfis, django_user_model):
    return django_user_model.objects.create_user(
        email="admin@inst.edu.br",
        password=SENHA,
        perfil=perfis["Administrador"],
    )
