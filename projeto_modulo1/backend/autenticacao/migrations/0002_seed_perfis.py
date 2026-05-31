from django.db import migrations

PERFIS = [
    ("Administrador", "Acesso total ao sistema."),
    ("Professor", "Solicita reservas de recursos didáticos."),
    ("Funcionario", "Gerencia triagem, check-in/out e manutenções."),
]


def criar_perfis(apps, schema_editor):
    PerfilAcesso = apps.get_model("autenticacao", "PerfilAcesso")
    for nome, descricao in PERFIS:
        PerfilAcesso.objects.get_or_create(nome=nome, defaults={"descricao": descricao})


def remover_perfis(apps, schema_editor):
    PerfilAcesso = apps.get_model("autenticacao", "PerfilAcesso")
    PerfilAcesso.objects.filter(nome__in=[n for n, _ in PERFIS]).delete()


class Migration(migrations.Migration):
    dependencies = [("autenticacao", "0001_initial")]
    operations = [migrations.RunPython(criar_perfis, remover_perfis)]
