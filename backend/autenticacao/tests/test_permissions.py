import pytest
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from autenticacao.permissions import IsFuncionario, perfis_requeridos

pytestmark = pytest.mark.django_db


class _ViewFuncionario(APIView):
    permission_classes = [IsFuncionario]

    def get(self, request):
        return Response({"ok": True})


class _ViewMulti(APIView):
    permission_classes = [perfis_requeridos("Administrador", "Funcionario")]

    def get(self, request):
        return Response({"ok": True})


def _call(view_cls, user=None):
    req = APIRequestFactory().get("/")
    if user is not None:
        force_authenticate(req, user=user)
    return view_cls.as_view()(req)


def test_funcionario_acessa(perfis, django_user_model):
    func = django_user_model.objects.create_user(
        email="f@inst.edu.br", password="x", perfil=perfis["Funcionario"]
    )
    assert _call(_ViewFuncionario, func).status_code == 200


def test_professor_negado(professor):
    assert _call(_ViewFuncionario, professor).status_code == 403


def test_anonimo_negado(db):
    # sem autenticação, DRF responde 401 ou 403 dependendo do schema de auth
    assert _call(_ViewFuncionario, None).status_code in (401, 403)


def test_perfis_requeridos_admin_passa(perfis, django_user_model):
    adm = django_user_model.objects.create_user(
        email="a@inst.edu.br", password="x", perfil=perfis["Administrador"]
    )
    assert _call(_ViewMulti, adm).status_code == 200


def test_perfis_requeridos_professor_nega(professor):
    assert _call(_ViewMulti, professor).status_code == 403


def test_endpoint_protegido_login_sem_token_funciona(api):
    """O endpoint de login é AllowAny por construção do simplejwt."""
    from django.urls import reverse

    resp = api.post(reverse("login"), {}, format="json")
    # 400 (bad request) — não 401, porque o endpoint aceita anônimo
    assert resp.status_code == 400
