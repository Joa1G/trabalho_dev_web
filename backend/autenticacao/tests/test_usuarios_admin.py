"""Gerenciamento de usuários pelo Administrador: criar, editar (status/staff/
e-mail), redefinir senha e excluir — funcionalidades equivalentes ao /admin."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

SENHA = "senha_super_segura_123"


# ---- Criação (POST /api/usuarios/) -----------------------------------------

def test_admin_cria_usuario_completo(api, administrador, perfis, django_user_model):
    api.force_authenticate(user=administrador)
    resp = api.post(
        reverse("usuario-list"),
        {
            "email": "novo@inst.edu.br",
            "senha": SENHA,
            "perfil": str(perfis["Funcionario"].id),
            "ativo": True,
            "staff": True,
        },
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "novo@inst.edu.br"
    assert body["perfil"] == "Funcionario"
    assert body["staff"] is True
    assert "senha" not in body

    u = django_user_model.objects.get(email="novo@inst.edu.br")
    assert u.check_password(SENHA)  # hash -> RN nº1
    assert u.is_staff is True


def test_admin_cria_usuario_minimo_sem_perfil(api, administrador, django_user_model):
    api.force_authenticate(user=administrador)
    resp = api.post(
        reverse("usuario-list"),
        {"email": "min@inst.edu.br", "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.json()["perfil"] is None
    u = django_user_model.objects.get(email="min@inst.edu.br")
    assert u.is_active is True and u.is_staff is False


def test_admin_cria_usuario_email_duplicado_400(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.post(
        reverse("usuario-list"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 400
    assert "email" in resp.json()


def test_criar_usuario_nao_admin_403(api, professor):
    api.force_authenticate(user=professor)
    resp = api.post(
        reverse("usuario-list"),
        {"email": "x@inst.edu.br", "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 403


# ---- Detalhe (GET /api/usuarios/<id>/) -------------------------------------

def test_admin_consulta_detalhe_usuario(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.get(reverse("usuario-detail", args=[professor.id]))
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == professor.email
    assert body["perfil"] == "Professor"
    assert set(body.keys()) == {"id", "email", "perfil", "perfil_id", "ativo", "staff"}


# ---- Edição de status / staff / e-mail (PATCH /api/usuarios/<id>/) ----------

def test_admin_desativa_usuario(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-detail", args=[professor.id]),
        {"ativo": False},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["ativo"] is False
    professor.refresh_from_db()
    assert professor.is_active is False


def test_usuario_inativo_nao_loga(api, administrador, professor):
    api.force_authenticate(user=administrador)
    api.patch(
        reverse("usuario-detail", args=[professor.id]),
        {"ativo": False},
        format="json",
    )
    api.force_authenticate(user=None)
    resp = api.post(
        reverse("login"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 401  # desativar bloqueia o login


def test_admin_define_staff(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-detail", args=[professor.id]),
        {"staff": True},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["staff"] is True


def test_admin_altera_email(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-detail", args=[professor.id]),
        {"email": "prof.novo@inst.edu.br"},
        format="json",
    )
    assert resp.status_code == 200
    professor.refresh_from_db()
    assert professor.email == "prof.novo@inst.edu.br"


def test_admin_nao_desativa_a_si_mesmo(api, administrador):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-detail", args=[administrador.id]),
        {"ativo": False},
        format="json",
    )
    assert resp.status_code == 400
    administrador.refresh_from_db()
    assert administrador.is_active is True


def test_editar_usuario_nao_admin_403(api, professor):
    api.force_authenticate(user=professor)
    resp = api.patch(
        reverse("usuario-detail", args=[professor.id]),
        {"staff": True},
        format="json",
    )
    assert resp.status_code == 403


# ---- Exclusão (DELETE /api/usuarios/<id>/) ---------------------------------

def test_admin_exclui_usuario(api, administrador, professor, django_user_model):
    api.force_authenticate(user=administrador)
    resp = api.delete(reverse("usuario-detail", args=[professor.id]))
    assert resp.status_code == 204
    assert not django_user_model.objects.filter(id=professor.id).exists()


def test_admin_nao_exclui_a_si_mesmo(api, administrador, django_user_model):
    api.force_authenticate(user=administrador)
    resp = api.delete(reverse("usuario-detail", args=[administrador.id]))
    assert resp.status_code == 400
    assert django_user_model.objects.filter(id=administrador.id).exists()


def test_excluir_usuario_nao_admin_403(api, professor, administrador):
    api.force_authenticate(user=professor)
    resp = api.delete(reverse("usuario-detail", args=[administrador.id]))
    assert resp.status_code == 403


def test_excluir_usuario_anonimo_401(api, professor):
    resp = api.delete(reverse("usuario-detail", args=[professor.id]))
    assert resp.status_code == 401
