import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UsuarioManager


class PerfilAcesso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "perfil_acesso"
        verbose_name = "Perfil de Acesso"
        verbose_name_plural = "Perfis de Acesso"

    def __str__(self):
        return self.nome


class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True, db_column="ativo")
    is_staff = models.BooleanField(default=False)
    perfil = models.ForeignKey(
        PerfilAcesso,
        on_delete=models.PROTECT,  # RN nº3
        related_name="usuarios",
        null=True,
        blank=True,
        db_column="perfil_id",
    )

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "usuario"

    def __str__(self):
        return self.email
