import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from autenticacao.models import PerfilAcesso

Usuario = get_user_model()


class Command(BaseCommand):
    help = "Cria (ou atualiza) um usuário Administrador de desenvolvimento."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-senha",
            action="store_true",
            help="Redefine a senha do admin caso ele já exista.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Permite rodar mesmo com DEBUG=False (use com cautela).",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Seed de admin é para desenvolvimento. "
                "Rode com DEBUG=True ou passe --force se souber o que está fazendo."
            )

        email = os.environ.get("DEV_ADMIN_EMAIL", "admin@instituicao.edu.br")
        senha = os.environ.get("DEV_ADMIN_PASSWORD", "admin123")

        perfil_admin, _ = PerfilAcesso.objects.get_or_create(
            nome="Administrador",
            defaults={"descricao": "Acesso total ao sistema."},
        )

        usuario, criado = Usuario.objects.get_or_create(
            email=email,
            defaults={
                "perfil": perfil_admin,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        if criado:
            usuario.set_password(senha)
            usuario.save(update_fields=["password"])
            self.stdout.write(
                self.style.SUCCESS(f"Admin de dev criado: {email} / {senha}")
            )
            return

        usuario.perfil = perfil_admin
        usuario.is_staff = True
        usuario.is_superuser = True
        usuario.is_active = True
        campos = ["perfil", "is_staff", "is_superuser", "is_active"]
        if options["reset_senha"]:
            usuario.set_password(senha)
            campos.append("password")
        usuario.save(update_fields=campos)

        msg = f"Admin de dev já existia: {email} (perfil/flags reafirmados)."
        if options["reset_senha"]:
            msg += f" Senha redefinida para: {senha}"
        self.stdout.write(self.style.WARNING(msg))
