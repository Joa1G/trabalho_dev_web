import pytest

pytestmark = pytest.mark.django_db


def test_create_user_faz_hash_da_senha(perfis, django_user_model):
    u = django_user_model.objects.create_user(
        email="x@inst.edu.br",
        password="abc123",
        perfil=perfis["Professor"],
    )
    assert u.password != "abc123"  # não texto puro -> RN nº1
    assert u.check_password("abc123")
    assert u.has_usable_password()


def test_create_user_exige_email(django_user_model):
    with pytest.raises(ValueError):
        django_user_model.objects.create_user(email="", password="x")


def test_create_user_normaliza_email(perfis, django_user_model):
    u = django_user_model.objects.create_user(
        email="Foo@INST.edu.br",
        password="abc",
        perfil=perfis["Professor"],
    )
    # parte do domínio é lowercased; parte local preservada
    assert u.email == "Foo@inst.edu.br"


def test_create_superuser_flags(perfis, django_user_model):
    su = django_user_model.objects.create_superuser(
        email="root@inst.edu.br", password="x"
    )
    assert su.is_staff is True
    assert su.is_superuser is True
