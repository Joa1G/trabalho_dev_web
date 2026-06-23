import pytest
from django.urls import reverse

from autenticacao.models import PerfilAcesso

pytestmark = pytest.mark.django_db


# ---- Criação de perfil (POST /api/perfis/) ---------------------------------

def test_criar_perfil_como_admin(api, administrador):
    api.force_authenticate(user=administrador)
    resp = api.post(
        reverse("perfil-list"),
        {"nome": "Coordenador", "descricao": "Coordena os cursos."},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["nome"] == "Coordenador"
    assert "id" in body
    assert PerfilAcesso.objects.filter(nome="Coordenador").exists()


def test_criar_perfil_sem_descricao(api, administrador):
    api.force_authenticate(user=administrador)
    resp = api.post(reverse("perfil-list"), {"nome": "Estagiario"}, format="json")
    assert resp.status_code == 201


def test_criar_perfil_nome_duplicado_400(api, administrador, perfis):
    api.force_authenticate(user=administrador)
    resp = api.post(reverse("perfil-list"), {"nome": "Professor"}, format="json")
    assert resp.status_code == 400
    assert "nome" in resp.json()


def test_criar_perfil_sem_nome_400(api, administrador):
    api.force_authenticate(user=administrador)
    resp = api.post(reverse("perfil-list"), {"descricao": "x"}, format="json")
    assert resp.status_code == 400


def test_criar_perfil_nao_admin_403(api, professor):
    api.force_authenticate(user=professor)
    resp = api.post(reverse("perfil-list"), {"nome": "Hacker"}, format="json")
    assert resp.status_code == 403


def test_criar_perfil_anonimo_401(api, db):
    resp = api.post(reverse("perfil-list"), {"nome": "Anon"}, format="json")
    assert resp.status_code == 401


# ---- Exclusão de perfil (DELETE /api/perfis/<id>/) -------------------------

def test_excluir_perfil_sem_usuarios_204(api, administrador):
    novo = PerfilAcesso.objects.create(nome="Temporario")
    api.force_authenticate(user=administrador)
    resp = api.delete(reverse("perfil-detail", args=[novo.id]))
    assert resp.status_code == 204
    assert not PerfilAcesso.objects.filter(id=novo.id).exists()


def test_excluir_perfil_com_usuarios_409(api, administrador, django_user_model):
    # perfil custom (não-reservado) com usuário vinculado -> PROTECT -> 409
    coord = PerfilAcesso.objects.create(nome="Coordenador")
    django_user_model.objects.create_user(
        email="coord@inst.edu.br", password="x", perfil=coord
    )
    api.force_authenticate(user=administrador)
    resp = api.delete(reverse("perfil-detail", args=[coord.id]))
    assert resp.status_code == 409
    assert PerfilAcesso.objects.filter(id=coord.id).exists()


def test_excluir_perfil_reservado_400(api, administrador, perfis):
    # Funcionario é reservado e não tem usuários -> bloqueio vem do guard, não do PROTECT
    api.force_authenticate(user=administrador)
    resp = api.delete(reverse("perfil-detail", args=[perfis["Funcionario"].id]))
    assert resp.status_code == 400
    assert PerfilAcesso.objects.filter(id=perfis["Funcionario"].id).exists()


def test_excluir_perfil_nao_admin_403(api, professor):
    alvo = PerfilAcesso.objects.create(nome="Descartavel")
    api.force_authenticate(user=professor)
    resp = api.delete(reverse("perfil-detail", args=[alvo.id]))
    assert resp.status_code == 403


def test_excluir_perfil_anonimo_401(api, db):
    alvo = PerfilAcesso.objects.create(nome="Descartavel2")
    resp = api.delete(reverse("perfil-detail", args=[alvo.id]))
    assert resp.status_code == 401
