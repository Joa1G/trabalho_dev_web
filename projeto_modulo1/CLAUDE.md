# CLAUDE.md — RF-01: Autenticação e Controle de Acesso

> Contexto para sessões de desenvolvimento assistido (Claude Code).
> Este arquivo é a **fonte de verdade** do RF-01. Quando houver conflito entre
> este documento e os arquivos originais da disciplina, **este documento vence**
> (as divergências estão registradas na seção "Decisões Arquiteturais").

---

## 1. Contexto do Projeto

- **Disciplina:** Desenvolvimento de Software (Bacharelado em Engenharia de Software).
- **Projeto macro:** plataforma acadêmica construída por uma turma de 38 alunos,
  dividida em 3 módulos independentes (fatias verticais). Eu sou o **Aluno 01**.
- **Meu escopo:** **RF-01 — Autenticação e Controle de Acesso**, do
  **Módulo 1: Sistema de Alocação de Recursos Didáticos** (RF-01 a RF-12).
- **Modelo de entrega (driver arquitetural nº1):** cada aluno desenvolve o seu RF
  **isoladamente**; depois **o professor junta todos os códigos em um único sistema**.
  Portanto o RF-01 não é "uma tela de login" — é um **serviço de autenticação e
  autorização plugável** que os outros 11 RFs do módulo vão consumir. Toda decisão
  aqui é tomada para **maximizar a integração no merge final**.

### Por que o RF-01 é a pedra fundamental
- `RF-02` (Professor) e `RF-03` (Funcionario) têm FK 1:1 **obrigatória** para `Usuario`.
- `RF-07`, `RF-08`, `RF-09`, `RF-12` carimbam `funcionario_id` / dependem de papel.
- O RBAC (perfis) controla o acesso de **todos** os endpoints do módulo.
- O JWT emitido aqui autentica **toda** requisição dos demais RFs.

Se a base de auth sair torta, os outros 11 alunos quebram. Robustez > velocidade.

---

## 2. Stack Tecnológica

### Backend
- **Python 3.12** · **Django 5.2 LTS** · **Django REST Framework** ·
  **djangorestframework-simplejwt** (JWT) · **PostgreSQL 14+** ·
  **django-cors-headers**.
- Gerenciador de dependências: **`uv`** (substitui o `venv + pip` do tutorial original).
- `reportlab` foi **removido** das dependências do RF-01 (pertence ao RF-11, não à auth).

> ⚠️ **Alinhar versões com a turma.** Como o professor vai rodar tudo em um único
> projeto, Python/Django precisam ser os mesmos em todos os RFs, senão migrations e
> APIs divergem. Django 5.2 LTS é a recomendação por estabilidade e suporte longo.

### Frontend (conforme `front_end.md`, que é a autoridade — ignora o frontend do tutorial)
- **React 18** (functional components + hooks) · **TypeScript (strict)** · **Vite**.
- **React Router v6** (rotas privadas) · **Axios** (interceptadores) ·
  **Zustand** (sessão) · **React Hook Form + Zod** (validação) ·
  **Tailwind CSS + shadcn/ui**.
- Testes: **Vitest** (unit/hooks) · **Cypress** (E2E do fluxo de login).
- Node 20 LTS.

---

## 3. Escopo do RF-01 (fronteiras explícitas)

### O RF-01 É dono de:
- Model `Usuario` (custom user model — `AUTH_USER_MODEL` do projeto inteiro).
- Model `PerfilAcesso` (papéis do RBAC).
- Endpoint de **login** (`POST /api/auth/login/`) e **refresh** (`POST /api/auth/refresh/`).
- Configuração do JWT no `settings` (validade do token).
- **Permission classes reutilizáveis** (RBAC) que os outros RFs importam.
- `UsuarioManager.create_user(...)` — porta de criação de usuários usada pelo RF-02/03.
- Seed dos 3 perfis (`Administrador`, `Professor`, `Funcionario`).
- Frontend: tela de Login, store de sessão, rota protegida, interceptador Axios.

### O RF-01 NÃO é dono de (não implementar aqui):
- **CRUD de usuários/professores/funcionários** → isso é RF-02 e RF-03. Eles criam
  o `Usuario` como efeito colateral, chamando o `create_user` deste app.
- Qualquer regra de reserva, inventário, manutenção, etc.

---

## 4. Regras de Negócio (RN)

1. **Hash de senha obrigatório e seguro.** Resolvido de graça pelo PBKDF2 nativo do
   Django (`set_password` / `check_password`). **Nunca** criar campo `senha_hash`
   manual nem hash artesanal.
2. **Token JWT de acesso com validade máxima de 2 horas.**
3. **Não excluir um `PerfilAcesso` que tenha usuários vinculados.** Implementado via
   `on_delete=models.PROTECT`.
   - *Nota honesta:* o enunciado diz "usuários **ativos**". O `PROTECT` é levemente
     mais estrito (bloqueia se houver qualquer usuário, ativo ou não). Mantido assim
     por ser mais seguro e simples; se for exigida fidelidade total, trocar por
     validação custom no `destroy` checando apenas `usuarios.filter(is_active=True)`.

---

## 5. Dicionário de Dados (specs)

### Tabela `perfil_acesso` (model `PerfilAcesso`)
| Atributo    | Tipo (PostgreSQL) | Restrição        | Descrição |
| :---------- | :---------------- | :--------------- | :-------- |
| `id`        | UUID              | PK               | Identificador único do perfil. |
| `nome`      | VARCHAR(50)       | UNIQUE, NOT NULL | Ex.: 'Administrador', 'Professor', 'Funcionario'. |
| `descricao` | VARCHAR(255)      | NULL             | Detalhe das permissões do perfil. |

Relacionamento: `PerfilAcesso` 1 : N `Usuario`.

### Tabela `usuario` (model `Usuario`)
| Atributo     | Tipo (PostgreSQL) | Restrição        | Descrição |
| :----------- | :---------------- | :--------------- | :-------- |
| `id`         | UUID              | PK               | Identificador único do usuário. |
| `email`      | VARCHAR(100)      | UNIQUE, NOT NULL | Credencial de login. |
| `senha_hash` | VARCHAR(255)      | NOT NULL         | Mapeado para o campo `password` nativo do Django. |
| `ativo`      | BOOLEAN           | DEFAULT TRUE     | Mapeado para `is_active` (coluna no banco continua `ativo`). |
| `perfil_id`  | UUID              | FK               | Referência para `perfil_acesso`. |

> **Mapeamento de nomes:** o dicionário descreve a *tabela*. No Django usamos os
> atributos nativos (`password`, `is_active`) com `db_column` apontando para o nome
> do banco quando aplicável — assim ganhamos toda a máquina de auth do Django sem
> abrir mão do schema da spec. No JSON exposto, apresentamos `ativo`.

---

## 6. Contrato de API (specs)

### `POST /api/auth/login/`
**Request:**
```json
{ "email": "professor@instituicao.edu.br", "senha": "senha_super_segura_123" }
```
**Response 200 OK:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "def456GHI789jkl012mno...",
  "usuario": {
    "id": "a1b2c3d4-e5f6-7890-1234-56789abcdef0",
    "email": "professor@instituicao.edu.br",
    "perfil": "Professor"
  }
}
```
**Erros:** `401 Unauthorized` para credenciais inválidas ou usuário inativo.

### `POST /api/auth/refresh/`
Padrão do simplejwt. Request `{ "refresh": "..." }` → Response `{ "access": "..." }`.

---

## 7. Decisões Arquiteturais (mini-ADRs)

**ADR-01 — App Django dedicado `autenticacao` (não o app único `alocacao`).**
O tutorial sugere `startapp alocacao` com todos os models num só `models.py`. Isso é
o pior cenário para "12 alunos isolados + merge": `models.py` divergentes e, pior,
12 históricos de migration colidindo no mesmo app. Apps Django são feitos para serem
plugáveis. O RF-01 vira o app `autenticacao`, com migrations próprias e isoladas.
O professor pluga via `INSTALLED_APPS` + `include(urls)`, e o Django resolve a ordem
das migrations pelas dependências de FK. *(Confirmado: o professor não obriga o app
único `alocacao`.)*

**ADR-02 — `Usuario` como custom user model (`AbstractBaseUser` + `PermissionsMixin`).**
Email como `USERNAME_FIELD`. Atende a RN nº1 com o hashing nativo. **`AUTH_USER_MODEL`
precisa estar definido no `settings` ANTES da primeira `migrate`** — trocar depois,
num banco compartilhado, é um pesadelo.

**ADR-03 — RBAC via `PerfilAcesso`, não via Groups do Django.**
O contrato devolve `"perfil": "Professor"` (string) e outros RFs ramificam por papel.
O RBAC é exposto como **permission classes** importáveis (ver seção 9).

**ADR-04 — `PROTECT` no FK de perfil.** Ver RN nº3.

**ADR-05 — `is_active` (atributo Django) com `db_column="ativo"`.**
Evita gambiarra de `property`, mantém o schema da spec e a compatibilidade total com
`authenticate`, admin e simplejwt.

---

## 8. Contrato de Integração (o que o RF-01 expõe para os outros 11 RFs)

Isto é o coração do "permitir o merge". Documentar e comunicar para a equipe:

1. **`AUTH_USER_MODEL = "autenticacao.Usuario"`** — único user model do projeto.
2. **FK para usuário:** os colegas **nunca** importam o model direto. Usam:
   ```python
   from django.conf import settings
   usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=...)
   perfil  = models.ForeignKey("autenticacao.PerfilAcesso", on_delete=...)  # se precisarem
   ```
3. **Criação de usuário (RF-02/RF-03):**
   ```python
   from django.contrib.auth import get_user_model
   Usuario = get_user_model()
   Usuario.objects.create_user(email=..., password=..., perfil=perfil_professor)
   ```
4. **Proteção de endpoints (RBAC):**
   ```python
   from autenticacao.permissions import IsFuncionario, perfis_requeridos
   permission_classes = [IsFuncionario]
   # ou: permission_classes = [perfis_requeridos("Administrador", "Funcionario")]
   ```
5. **Autenticação automática:** com o JWT no `DEFAULT_AUTHENTICATION_CLASSES`, todo
   endpoint recebe `request.user` já resolvido via header `Authorization: Bearer ...`.
6. **Perfis já semeados** (`Administrador`, `Professor`, `Funcionario`) pela migration
   de seed — a base sobe utilizável.

---

## 9. Implementação de Referência — Backend

### `autenticacao/managers.py`
```python
from django.contrib.auth.base_user import BaseUserManager


class UsuarioManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # PBKDF2 -> RN nº1
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if not extra_fields.get("is_staff"):
            raise ValueError("Superusuário precisa de is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superusuário precisa de is_superuser=True.")
        return self._create_user(email, password, **extra_fields)
```

### `autenticacao/models.py`
```python
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
    is_active = models.BooleanField(default=True, db_column="ativo")  # coluna = ativo
    is_staff = models.BooleanField(default=False)
    perfil = models.ForeignKey(
        PerfilAcesso,
        on_delete=models.PROTECT,        # RN nº3
        related_name="usuarios",
        null=True, blank=True,
        db_column="perfil_id",
    )

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "usuario"

    def __str__(self):
        return self.email
```

### `autenticacao/permissions.py`
```python
from rest_framework.permissions import BasePermission


class TemPerfil(BasePermission):
    """RBAC central reutilizado por todos os RFs do módulo."""
    perfis_permitidos: list[str] = []

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.perfil_id is not None
            and user.perfil.nome in self.perfis_permitidos
        )


class IsAdministrador(TemPerfil):
    perfis_permitidos = ["Administrador"]


class IsProfessor(TemPerfil):
    perfis_permitidos = ["Professor"]


class IsFuncionario(TemPerfil):
    perfis_permitidos = ["Funcionario"]


def perfis_requeridos(*nomes):
    class _Perm(TemPerfil):
        perfis_permitidos = list(nomes)
    return _Perm
```

### `autenticacao/serializers.py`
```python
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class LoginSerializer(TokenObtainPairSerializer):
    """Contrato usa 'email' + 'senha' e devolve o objeto 'usuario' aninhado."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # renomeia o campo 'password' para 'senha' conforme o contrato
        self.fields["senha"] = self.fields.pop("password")

    def validate(self, attrs):
        attrs["password"] = attrs.pop("senha")   # remapeia para o que o simplejwt espera
        data = super().validate(attrs)            # valida credenciais + gera tokens
        data["usuario"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "perfil": self.user.perfil.nome if self.user.perfil_id else None,
        }
        return data
```

### `autenticacao/views.py`
```python
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
```

### `autenticacao/urls.py`
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
```
No `backend/urls.py`: `path("api/", include("autenticacao.urls"))`.

### `autenticacao/migrations/0002_seed_perfis.py`
```python
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
```

### `settings.py` (trechos do RF-01)
```python
from datetime import timedelta

INSTALLED_APPS = [
    # ... apps padrão ...
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "autenticacao",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # ... resto ...
]
CORS_ALLOW_ALL_ORIGINS = True  # só em desenvolvimento

AUTH_USER_MODEL = "autenticacao.Usuario"  # ANTES da primeira migration

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),   # RN nº2
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "modulo1_alocacao",
        "USER": "user_modulo1",
        "PASSWORD": "senha123",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

### `autenticacao/management/commands/seed_admin.py` (admin de dev)
> Estrutura de pastas necessária (com os `__init__.py` vazios):
> `autenticacao/management/__init__.py` e
> `autenticacao/management/commands/__init__.py`.
>
> **Management command, não data migration:** seedar usuário com senha via migration
> rodaria em todo ambiente (inclusive produção) e deixaria credencial no histórico.
> O comando é explícito, idempotente, sobrescrevível por env var e protegido contra
> rodar fora de `DEBUG`.

```python
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

        # depende do perfil "Administrador" (seed_perfis); get_or_create por robustez
        perfil_admin, _ = PerfilAcesso.objects.get_or_create(
            nome="Administrador",
            defaults={"descricao": "Acesso total ao sistema."},
        )

        usuario, criado = Usuario.objects.get_or_create(
            email=email,
            defaults={
                "perfil": perfil_admin,
                "is_staff": True,       # acesso também ao /admin do Django
                "is_superuser": True,
                "is_active": True,
            },
        )

        if criado:
            usuario.set_password(senha)
            usuario.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(
                f"Admin de dev criado: {email} / {senha}"
            ))
            return

        # idempotente: garante perfil/flags corretos mesmo se já existir
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
```

**Uso:**
```bash
uv run python manage.py seed_admin                 # cria se não existir
uv run python manage.py seed_admin --reset-senha   # redefine a senha se já existir
DEV_ADMIN_EMAIL=eu@inst.edu DEV_ADMIN_PASSWORD=outra uv run python manage.py seed_admin
```

> **Nota:** este admin tem o perfil RBAC `Administrador` (o que a aplicação consome)
> **e** `is_superuser=True` (bônus: acessa o `/admin` do Django). Diferente do
> `createsuperuser`, que cria um superusuário com `perfil=null` e, por isso, não passa
> nas permission classes de papel. Credenciais padrão são **só para dev** — sobrescrever
> via `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD`.

---

## 10. Implementação de Referência — Frontend (blueprint)

Estrutura conforme `front_end.md` (`src/api`, `src/store`, `src/routes`, `src/hooks`,
`src/types`, `src/pages`, `src/layouts`, `src/components`).

### Peças críticas para a integração
- **`src/types/auth.ts`** — tipos do contrato:
  ```ts
  export interface UsuarioSessao { id: string; email: string; perfil: string | null; }
  export interface LoginResponse { access: string; refresh: string; usuario: UsuarioSessao; }
  ```
- **`src/store/useAuthStore.ts`** (Zustand) — guarda `usuario`, `access`, `refresh`,
  `isAuthenticated`; ações `login`, `logout`. Tokens persistem em `localStorage`
  (pragmático para o projeto; registrar o tradeoff de XSS vs. cookie httpOnly).
- **`src/api/client.ts`** (Axios) — interceptador de **request** injeta
  `Authorization: Bearer <access>`; interceptador de **response** tenta `auth/refresh/`
  uma vez no `401` e, se falhar, faz `logout` + redireciona para `/login`.
- **`src/pages/Login.tsx`** — React Hook Form + Zod (schema: `email` válido, `senha`
  não vazia). No sucesso, chama `login()` do store e navega para a home.
- **`src/routes/PrivateRoute.tsx`** — `Navigate` para `/login` se `!isAuthenticated`;
  opcionalmente recebe `perfis` para gate por papel (espelha o RBAC do backend).

### Identidade visual (IFAM)
Sistema institucional → seguir o **Manual de Aplicação da Marca do IFAM** (adaptado do
Manual da Marca IF, Portaria SETEC/MEC nº 31/2015).

**Cores oficiais da marca (3 cores — não alterar):**
| Cor | HEX | PANTONE | Significado |
| :-- | :-- | :-- | :-- |
| Verde | `#2f9e41` | 362 C | Harmonia e integração na rede |
| Vermelho | `#cd191e` | 187 C | Pensamento forte, com energia |
| Preto | `#000000` | Process Black C | — |

**Tipografia oficial:** **Open Sans** (a mesma da marca). Usar via
`@fontsource/open-sans` (sem depender de CDN).

**Mapeamento semântico (decisão de design):** a paleta de marca não vira paleta de app
direto. Verde = **primária/ação**; vermelho = **só destrutivo/erro** (evita conflito com
a semântica de UX e com as ações de aprovar/rejeitar do RF-07); preto/neutros = texto e
estrutura. Para legibilidade (AA), verde de marca fica em **preenchimentos** com texto
branco; para texto verde sobre branco ou hover, usar o tom mais escuro `#25803a`.

```css
/* src/assets/theme.css — tokens institucionais */
:root {
  /* marca oficial (imutável) */
  --ifam-verde:    #2f9e41;
  --ifam-vermelho: #cd191e;
  --ifam-preto:    #000000;

  /* papéis semânticos (derivados) */
  --color-primary:       var(--ifam-verde);
  --color-primary-hover: #25803a;     /* contraste AA p/ rótulo branco */
  --color-primary-fg:    #ffffff;

  --color-destructive:       var(--ifam-vermelho);
  --color-destructive-hover: #a8141a;
  --color-destructive-fg:    #ffffff;

  --color-fg:       #111827;
  --color-fg-muted: #6b7280;
  --color-border:   #e5e7eb;
  --color-bg:       #f9fafb;          /* fundo da página */
  --color-surface:  #ffffff;          /* cards, formulários */
}
```

```js
// tailwind.config.js (theme.extend)
colors: {
  ifam:        { verde: "#2f9e41", vermelho: "#cd191e", preto: "#000000" },
  primary:     { DEFAULT: "#2f9e41", hover: "#25803a", fg: "#ffffff" },
  destructive: { DEFAULT: "#cd191e", hover: "#a8141a", fg: "#ffffff" },
},
fontFamily: { sans: ['"Open Sans"', "system-ui", "sans-serif"] },
```

**Logo — usar o asset oficial, NÃO recriar.** Baixar o logo (SVG/PNG, versões horizontal
e vertical) na página de Identidade Visual do IFAM e versionar em `src/assets/`. Regras
do manual a respeitar:
- **Não** distorcer, alterar cores, estilizar, emoldurar ou criar variações da marca.
- **Reserva de integridade:** manter área livre de ≥ 1 módulo ao redor da marca.
- **Redução mínima:** símbolo nunca menor que 1 cm / 30 px.
- **Fundos:** sobre fundo colorido/escuro, aplicar a marca sobre base branca; em fundo
  escuro a tipografia da marca pode ser branca.
- **Header:** usar a assinatura **horizontal** (espaço horizontal → versão horizontal).
- **Proibido criar marca para o sistema/PROAD.** Usar a marca institucional do IFAM +
  o nome do sistema como **texto** (ex.: "Alocação de Recursos Didáticos"), nunca um
  logo próprio que concorra com a marca.

---

## 11. Setup (revisado, com `uv`)

### Banco (PostgreSQL)
```sql
CREATE DATABASE modulo1_alocacao;
CREATE USER user_modulo1 WITH PASSWORD 'senha123';
ALTER ROLE user_modulo1 SET client_encoding TO 'utf8';
ALTER ROLE user_modulo1 SET timezone TO 'America/Sao_Paulo';
GRANT ALL PRIVILEGES ON DATABASE modulo1_alocacao TO user_modulo1;
```

### Backend
```bash
mkdir projeto_modulo1 && cd projeto_modulo1
uv init backend && cd backend
uv add django djangorestframework djangorestframework-simplejwt \
       psycopg2-binary django-cors-headers
uv add --dev pytest pytest-django pytest-cov   # testes (ver seção 13)
uv run django-admin startproject backend .
uv run python manage.py startapp autenticacao
# ... aplicar settings + código de referência ...
uv run python manage.py makemigrations
uv run python manage.py migrate            # cria tabelas + seed dos 3 perfis
uv run python manage.py seed_admin         # admin de dev com perfil "Administrador"
uv run python manage.py runserver          # http://127.0.0.1:8000/
# (createsuperuser continua disponível, mas cria superuser com perfil=null)
```

### Frontend
```bash
cd projeto_modulo1
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install axios react-router-dom zustand react-hook-form zod @hookform/resolvers
# Tailwind + shadcn/ui conforme docs oficiais
npm run dev   # http://localhost:5173/
```

---

## 12. Definition of Done (RF-01)

- [ ] `migrate` cria `usuario` e `perfil_acesso`; seed insere os 3 perfis.
- [ ] `seed_admin` cria um admin logável com perfil `Administrador` (idempotente).
- [ ] `POST /api/auth/login/` responde exatamente o contrato (com `usuario.perfil`).
- [ ] Login com credenciais erradas ou usuário inativo → `401`.
- [ ] Token de acesso expira em 2h (testar `ACCESS_TOKEN_LIFETIME`).
- [ ] Tentar excluir um perfil com usuário vinculado → bloqueado (`PROTECT`).
- [ ] Endpoint qualquer protegido por `IsAuthenticated` recusa sem token (`401`).
- [ ] Permission classes (`IsProfessor`/`IsFuncionario`/`IsAdministrador`) testadas.
- [ ] Front: login funcional, token persistido, rota privada redireciona sem sessão,
      interceptador renova no `401`.
- [ ] E2E (Cypress) do fluxo de login passando.
- [ ] **Suite de testes do backend passando e cobrindo toda a matriz da seção 13.**

---

## 13. Testes do Backend (obrigatório)

Testing é critério não-negociável: como o RF-01 autentica e autoriza **todos** os
outros RFs do módulo, qualquer regressão aqui quebra os 11 colegas no merge.
Princípio: TDD nos caminhos críticos; **as 3 RNs e o contrato de API têm cobertura
de 100%**.

### Ferramentas
- **pytest + pytest-django + pytest-cov** (grupo de dev) e o `APIClient` do DRF.
- > Alinhar com a turma: se o professor for rodar uma suite única no projeto
  > integrado, vale combinar o mesmo runner entre os RFs. `pytest` é a recomendação.

### Config (`pyproject.toml`)
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "backend.settings"
python_files = ["test_*.py"]
addopts = "--cov=autenticacao --cov-report=term-missing"
```

### Fixtures (`autenticacao/tests/conftest.py`)
```python
import pytest
from rest_framework.test import APIClient

from autenticacao.models import PerfilAcesso

SENHA = "senha_super_segura_123"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def perfis(db):
    # a migration de seed já cria os 3 perfis no banco de teste -> get_or_create
    return {
        nome: PerfilAcesso.objects.get_or_create(nome=nome)[0]
        for nome in ("Administrador", "Professor", "Funcionario")
    }


@pytest.fixture
def professor(db, perfis, django_user_model):
    return django_user_model.objects.create_user(
        email="prof@inst.edu.br", password=SENHA, perfil=perfis["Professor"],
    )
```

### Matriz de testes (o que PRECISA ser coberto)
| # | Caso | Esperado | Cobre |
| :- | :--- | :--- | :--- |
| 1 | Login com credenciais válidas | `200` + shape exato (`access`, `refresh`, `usuario{id,email,perfil}`) | Contrato |
| 2 | Login com senha errada | `401` | Contrato |
| 3 | Login com email inexistente | `401` | Contrato |
| 4 | Login de usuário inativo | `401` | Contrato |
| 5 | Login sem o campo `senha` | `400` | Contrato |
| 6 | Validade do access token | `exp - iat == 7200s` | RN nº2 |
| 7 | `create_user` aplica hash | senha não fica em texto puro; `check_password` confere | RN nº1 |
| 8 | Excluir perfil COM usuário | `ProtectedError` | RN nº3 |
| 9 | Excluir perfil SEM usuário | sucesso | RN nº3 |
| 10 | `IsFuncionario` com perfil certo | acesso permitido | RBAC |
| 11 | `IsFuncionario` com perfil errado | `403` | RBAC |
| 12 | Endpoint protegido sem token | `401` | RBAC |
| 13 | `seed_admin` idempotente | rodar 2x não duplica; admin com perfil `Administrador` | Comando |

### Testes de referência (padrão a seguir)
```python
# autenticacao/tests/test_login.py
import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken

pytestmark = pytest.mark.django_db
SENHA = "senha_super_segura_123"


def test_login_sucesso_retorna_contrato(api, professor):
    resp = api.post(reverse("login"),
                    {"email": professor.email, "senha": SENHA}, format="json")
    assert resp.status_code == 200
    body = resp.json()
    assert "access" in body and "refresh" in body
    assert body["usuario"] == {
        "id": str(professor.id), "email": professor.email, "perfil": "Professor",
    }


def test_login_senha_errada_401(api, professor):
    resp = api.post(reverse("login"),
                    {"email": professor.email, "senha": "errada"}, format="json")
    assert resp.status_code == 401


def test_login_usuario_inativo_401(api, professor):
    professor.is_active = False
    professor.save(update_fields=["is_active"])
    resp = api.post(reverse("login"),
                    {"email": professor.email, "senha": SENHA}, format="json")
    assert resp.status_code == 401


def test_login_sem_senha_400(api, professor):
    resp = api.post(reverse("login"), {"email": professor.email}, format="json")
    assert resp.status_code == 400


def test_access_token_expira_em_2h(api, professor):
    resp = api.post(reverse("login"),
                    {"email": professor.email, "senha": SENHA}, format="json")
    token = AccessToken(resp.json()["access"])
    assert token["exp"] - token["iat"] == 2 * 60 * 60   # RN nº2
```

```python
# autenticacao/tests/test_manager.py
import pytest

pytestmark = pytest.mark.django_db


def test_create_user_faz_hash_da_senha(perfis, django_user_model):
    u = django_user_model.objects.create_user(
        email="x@inst.edu.br", password="abc123", perfil=perfis["Professor"],
    )
    assert u.password != "abc123"            # não é texto puro -> RN nº1
    assert u.check_password("abc123")
    assert u.has_usable_password()
```

```python
# autenticacao/tests/test_perfil.py
import pytest
from django.db.models import ProtectedError

from autenticacao.models import PerfilAcesso

pytestmark = pytest.mark.django_db


def test_nao_exclui_perfil_com_usuario(professor, perfis):
    with pytest.raises(ProtectedError):       # RN nº3
        perfis["Professor"].delete()


def test_exclui_perfil_sem_usuario(db):
    novo = PerfilAcesso.objects.create(nome="Temporario")
    novo.delete()
    assert not PerfilAcesso.objects.filter(nome="Temporario").exists()
```

```python
# autenticacao/tests/test_permissions.py
import pytest
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from autenticacao.permissions import IsFuncionario

pytestmark = pytest.mark.django_db


class _ViewProtegida(APIView):
    permission_classes = [IsFuncionario]

    def get(self, request):
        return Response({"ok": True})


def _chamar(user=None):
    req = APIRequestFactory().get("/")
    if user is not None:
        force_authenticate(req, user=user)
    return _ViewProtegida.as_view()(req)


def test_funcionario_acessa(perfis, django_user_model):
    func = django_user_model.objects.create_user(
        email="f@inst.edu.br", password="x", perfil=perfis["Funcionario"],
    )
    assert _chamar(func).status_code == 200


def test_professor_negado(professor):
    assert _chamar(professor).status_code == 403


def test_anonimo_negado(db):
    assert _chamar(None).status_code in (401, 403)
```

### Rodando
```bash
uv add --dev pytest pytest-django pytest-cov
uv run pytest                 # roda tudo + relatório de cobertura
uv run pytest -k login        # só os testes de login
```

---

## 14. Convenções
- Domínio em **PT-BR** (`Usuario`, `PerfilAcesso`, `senha`); termos técnicos do
  framework em inglês (`is_active`, `password`).
- `ruff`/`black` no backend; `ESLint + Prettier` no front.
- Nada de segredo hardcoded em commit; `settings` sensível via variável de ambiente
  antes da entrega final (no dev local seguimos o tutorial por simplicidade).
