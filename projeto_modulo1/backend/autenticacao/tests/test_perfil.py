import pytest
from django.db.models import ProtectedError

from autenticacao.models import PerfilAcesso

pytestmark = pytest.mark.django_db


def test_nao_exclui_perfil_com_usuario(professor, perfis):
    with pytest.raises(ProtectedError):  # RN nº3
        perfis["Professor"].delete()


def test_exclui_perfil_sem_usuario(db):
    novo = PerfilAcesso.objects.create(nome="Temporario")
    novo.delete()
    assert not PerfilAcesso.objects.filter(nome="Temporario").exists()


def test_seed_perfis_existentes(perfis):
    assert set(perfis) == {"Administrador", "Professor", "Funcionario"}
    for p in perfis.values():
        assert p.pk is not None
