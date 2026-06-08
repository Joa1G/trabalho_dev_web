import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

SENHA = "senha_super_segura_123"


def test_cadastro_publico_cria_usuario_sem_perfil(api, db, django_user_model):
    resp = api.post(
        reverse("cadastro"),
        {"email": "novo@inst.edu.br", "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "novo@inst.edu.br"
    assert "senha" not in body  # write_only — nunca volta na resposta

    user = django_user_model.objects.get(email="novo@inst.edu.br")
    assert user.perfil_id is None  # sem perfil até o admin atribuir
    assert user.is_active is True
    assert user.password != SENHA  # hash -> RN nº1
    assert user.check_password(SENHA)


def test_cadastro_nao_exige_autenticacao(api, db):
    # endpoint público: sem token, ainda cria (201)
    resp = api.post(
        reverse("cadastro"),
        {"email": "publico@inst.edu.br", "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 201


def test_cadastro_email_duplicado_400(api, professor):
    resp = api.post(
        reverse("cadastro"),
        {"email": professor.email, "senha": SENHA},
        format="json",
    )
    assert resp.status_code == 400
    assert "email" in resp.json()


def test_cadastro_senha_curta_400(api, db):
    resp = api.post(
        reverse("cadastro"),
        {"email": "curto@inst.edu.br", "senha": "1234"},
        format="json",
    )
    assert resp.status_code == 400
    assert "senha" in resp.json()


def test_cadastro_sem_senha_400(api, db):
    resp = api.post(
        reverse("cadastro"),
        {"email": "semsenha@inst.edu.br"},
        format="json",
    )
    assert resp.status_code == 400
