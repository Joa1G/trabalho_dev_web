import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

pytestmark = pytest.mark.django_db
SENHA = "senha_super_segura_123"


def test_login_sucesso_retorna_contrato(api, professor):
    resp = api.post(
        reverse("login"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access" in body and "refresh" in body
    assert body["usuario"] == {
        "id": str(professor.id),
        "email": professor.email,
        "perfil": "Professor",
    }


def test_login_senha_errada_401(api, professor):
    resp = api.post(
        reverse("login"),
        {"email": professor.email, "senha": "errada"},
        format="json",
    )
    assert resp.status_code == 401


def test_login_email_inexistente_401(api, db):
    resp = api.post(
        reverse("login"),
        {"email": "nao_existe@inst.edu.br", "senha": "qualquer"},
        format="json",
    )
    assert resp.status_code == 401


def test_login_usuario_inativo_401(api, professor):
    professor.is_active = False
    professor.save(update_fields=["is_active"])
    resp = api.post(
        reverse("login"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 401


def test_login_sem_senha_400(api, professor):
    resp = api.post(reverse("login"), {"email": professor.email}, format="json")
    assert resp.status_code == 400


def test_access_token_expira_em_2h(api, professor):
    resp = api.post(
        reverse("login"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    token = AccessToken(resp.json()["access"])
    assert token["exp"] - token["iat"] == 2 * 60 * 60  # RN nº2


def test_refresh_gera_novo_access(api, professor):
    login = api.post(
        reverse("login"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    refresh = login.json()["refresh"]
    resp = api.post(reverse("token-refresh"), {"refresh": refresh}, format="json")
    assert resp.status_code == 200
    assert "access" in resp.json()
