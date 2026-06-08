import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

SENHA = "senha_super_segura_123"


# ---- Listagem de usuários (GET /api/usuarios/) -----------------------------

def test_listar_usuarios_como_admin(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.get(reverse("usuario-list"))
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert {administrador.email, professor.email} <= emails

    prof_row = next(u for u in resp.json() if u["email"] == professor.email)
    assert set(prof_row.keys()) == {"id", "email", "perfil", "perfil_id", "ativo"}
    assert prof_row["perfil"] == "Professor"
    assert prof_row["perfil_id"] == str(professor.perfil_id)
    assert prof_row["ativo"] is True


def test_listar_usuarios_perfil_nulo_aparece(api, administrador, django_user_model):
    sem_perfil = django_user_model.objects.create_user(
        email="semperfil@inst.edu.br", password=SENHA, perfil=None
    )
    api.force_authenticate(user=administrador)
    resp = api.get(reverse("usuario-list"))
    row = next(u for u in resp.json() if u["email"] == sem_perfil.email)
    assert row["perfil"] is None
    assert row["perfil_id"] is None


def test_listar_usuarios_nao_admin_403(api, professor):
    api.force_authenticate(user=professor)
    assert api.get(reverse("usuario-list")).status_code == 403


def test_listar_usuarios_anonimo_401(api, db):
    assert api.get(reverse("usuario-list")).status_code == 401


# ---- Listagem de perfis (GET /api/perfis/) ---------------------------------

def test_listar_perfis_como_admin(api, administrador, perfis):
    api.force_authenticate(user=administrador)
    resp = api.get(reverse("perfil-list"))
    assert resp.status_code == 200
    nomes = {p["nome"] for p in resp.json()}
    assert {"Administrador", "Professor", "Funcionario"} <= nomes


def test_listar_perfis_nao_admin_403(api, professor):
    api.force_authenticate(user=professor)
    assert api.get(reverse("perfil-list")).status_code == 403


# ---- Atribuição de perfil (PATCH /api/usuarios/<id>/perfil/) ----------------

def test_admin_atribui_perfil(api, administrador, perfis, django_user_model):
    alvo = django_user_model.objects.create_user(
        email="alvo@inst.edu.br", password=SENHA, perfil=None
    )
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-perfil", args=[alvo.id]),
        {"perfil": str(perfis["Funcionario"].id)},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["perfil"] == "Funcionario"
    alvo.refresh_from_db()
    assert alvo.perfil_id == perfis["Funcionario"].id


def test_admin_remove_perfil_com_null(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-perfil", args=[professor.id]),
        {"perfil": None},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["perfil"] is None
    professor.refresh_from_db()
    assert professor.perfil_id is None


def test_atribuir_perfil_inexistente_400(api, administrador, professor):
    api.force_authenticate(user=administrador)
    resp = api.patch(
        reverse("usuario-perfil", args=[professor.id]),
        {"perfil": "00000000-0000-0000-0000-000000000000"},
        format="json",
    )
    assert resp.status_code == 400


def test_atribuir_perfil_nao_admin_403(api, professor, perfis):
    api.force_authenticate(user=professor)
    resp = api.patch(
        reverse("usuario-perfil", args=[professor.id]),
        {"perfil": str(perfis["Administrador"].id)},
        format="json",
    )
    assert resp.status_code == 403


def test_atribuir_perfil_anonimo_401(api, professor, perfis):
    resp = api.patch(
        reverse("usuario-perfil", args=[professor.id]),
        {"perfil": str(perfis["Professor"].id)},
        format="json",
    )
    assert resp.status_code == 401
