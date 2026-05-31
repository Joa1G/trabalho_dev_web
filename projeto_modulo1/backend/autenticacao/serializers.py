from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class LoginSerializer(TokenObtainPairSerializer):
    """Contrato usa 'email' + 'senha' e devolve o objeto 'usuario' aninhado."""

    senha = serializers.CharField(write_only=True, label="Senha")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # remove o campo 'password' herdado — usamos 'senha' no contrato
        self.fields.pop("password", None)

    def validate(self, attrs):
        attrs["password"] = attrs.pop("senha")
        data = super().validate(attrs)
        data["usuario"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "perfil": self.user.perfil.nome if self.user.perfil_id else None,
        }
        return data
