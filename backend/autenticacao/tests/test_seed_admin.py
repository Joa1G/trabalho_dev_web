import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from autenticacao.models import PerfilAcesso

pytestmark = pytest.mark.django_db


def test_seed_admin_cria_admin_com_perfil(db, settings):
    settings.DEBUG = True
    call_command("seed_admin")

    Usuario = get_user_model()
    email = "admin@instituicao.edu.br"
    admin = Usuario.objects.get(email=email)
    assert admin.is_active and admin.is_staff and admin.is_superuser
    assert admin.perfil is not None and admin.perfil.nome == "Administrador"
    assert admin.check_password("admin123")


def test_seed_admin_idempotente(db, settings):
    settings.DEBUG = True
    call_command("seed_admin")
    call_command("seed_admin")

    Usuario = get_user_model()
    assert Usuario.objects.filter(email="admin@instituicao.edu.br").count() == 1
    assert PerfilAcesso.objects.filter(nome="Administrador").count() == 1


def test_seed_admin_reset_senha(db, settings):
    settings.DEBUG = True
    call_command("seed_admin")
    Usuario = get_user_model()
    admin = Usuario.objects.get(email="admin@instituicao.edu.br")
    admin.set_password("alterada_manualmente")
    admin.save(update_fields=["password"])

    call_command("seed_admin", "--reset-senha")
    admin.refresh_from_db()
    assert admin.check_password("admin123")


def test_seed_admin_bloqueado_sem_debug(db, settings):
    from django.core.management.base import CommandError

    settings.DEBUG = False
    with pytest.raises(CommandError):
        call_command("seed_admin")


def test_seed_admin_force_quando_nao_debug(db, settings):
    settings.DEBUG = False
    call_command("seed_admin", "--force")
    Usuario = get_user_model()
    assert Usuario.objects.filter(email="admin@instituicao.edu.br").exists()
