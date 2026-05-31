from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import PerfilAcesso, Usuario


@admin.register(PerfilAcesso)
class PerfilAcessoAdmin(admin.ModelAdmin):
    list_display = ("nome", "descricao")
    search_fields = ("nome",)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "perfil", "is_active", "is_staff")
    list_filter = ("perfil", "is_active", "is_staff")
    search_fields = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password", "perfil")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Permissões", {"fields": ("groups", "user_permissions")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "perfil", "is_active"),
            },
        ),
    )
