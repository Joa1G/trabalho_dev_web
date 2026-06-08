from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PerfilAcesso, Usuario


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


class CadastroSerializer(serializers.ModelSerializer):
    """Auto-cadastro público. Cria o usuário SEM perfil (perfil_id = null);
    a atribuição do perfil é responsabilidade do Administrador."""

    email = serializers.EmailField(
        max_length=100,
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="Já existe um usuário com este e-mail.",
            )
        ],
    )
    senha = serializers.CharField(
        write_only=True,
        min_length=8,
        label="Senha",
        error_messages={"min_length": "A senha deve ter ao menos 8 caracteres."},
    )

    class Meta:
        model = Usuario
        fields = ["id", "email", "senha"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        return Usuario.objects.create_user(
            email=validated_data["email"],
            password=validated_data["senha"],
            perfil=None,  # sem perfil até o Administrador atribuir
        )


class PerfilAcessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilAcesso
        fields = ["id", "nome", "descricao"]


class UsuarioSerializer(serializers.ModelSerializer):
    """Representação de usuário para o painel do Administrador."""

    perfil = serializers.SlugRelatedField(slug_field="nome", read_only=True)
    perfil_id = serializers.PrimaryKeyRelatedField(source="perfil", read_only=True)
    ativo = serializers.BooleanField(source="is_active", read_only=True)

    class Meta:
        model = Usuario
        fields = ["id", "email", "perfil", "perfil_id", "ativo"]


class AtribuirPerfilSerializer(serializers.ModelSerializer):
    """Atribui (ou remove, com null) o perfil de acesso de um usuário."""

    perfil = serializers.PrimaryKeyRelatedField(
        queryset=PerfilAcesso.objects.all(), allow_null=True
    )

    class Meta:
        model = Usuario
        fields = ["perfil"]
