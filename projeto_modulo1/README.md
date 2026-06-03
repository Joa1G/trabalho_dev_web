# Módulo 1 — RF-01: Autenticação e Controle de Acesso

Serviço de autenticação/autorização (JWT + RBAC) que os outros 11 RFs do
Módulo 1 vão consumir. Backend Django 5.2 LTS + DRF + simplejwt, frontend
React 18 + Vite + TypeScript estrito + Tailwind (paleta IFAM).

A fonte de verdade do escopo, contratos e decisões arquiteturais é o arquivo
[`../CLAUDE.md`](../CLAUDE.md).

---

## Pré-requisitos

- Docker + docker-compose
- `uv` (gerenciador Python — instala Python 3.12 automaticamente)
- Node 20+

## Setup rápido — Linux / macOS

```bash
cp .env.example .env          # ajuste DB_HOST_PORT se 5432 estiver ocupada na sua máquina
make bootstrap                # uv sync + npm install
make setup                    # docker up + migrate + seed admin
```

Em dois terminais:

```bash
make backend                  # http://localhost:8000/api/auth/login/
make front                    # http://localhost:5173/
```

## Setup rápido — Windows

Pré-requisitos (instala uma vez, em PowerShell como admin):

```powershell
winget install Docker.DockerDesktop
winget install astral-sh.uv
winget install OpenJS.NodeJS.LTS
```

Depois, dentro da pasta `projeto_modulo1\`, basta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1   # faz TUDO
powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1     # sobe back + front
```

`setup.ps1` é idempotente (pode rodar quantas vezes precisar). Ele checa
pré-requisitos, copia `.env.example → .env`, sobe o Postgres, sincroniza
dependências e roda migrate + seed. `dev.ps1` abre o Django e o Vite em janelas
separadas.

> **Sem WSL, sem Make, sem Git Bash.** Apenas Docker Desktop + uv + Node.

## Setup SEM Docker (Postgres local + pgAdmin)

Plano B para quando o Docker não estiver disponível na máquina (ex.: na
avaliação). Em vez do Postgres em container, usa-se um **PostgreSQL instalado
nativamente**, administrado pelo **pgAdmin**. O Django não muda — ele lê a
conexão do `.env`; só apontamos `DB_HOST`/`DB_PORT` para o servidor local.

**Tutorial passo a passo (com pgAdmin):** [`docs/SETUP_PGADMIN.md`](docs/SETUP_PGADMIN.md)

Resumo:

```bash
# 1. Crie banco + usuário no Postgres local.
#    - via pgAdmin (recomendado): siga docs/SETUP_PGADMIN.md
#    - ou via psql:   psql -U postgres -h localhost -f scripts/init_db.sql
# 2. Ajuste o .env apontando DB_HOST/DB_PORT para o Postgres local (padrão 5432).
cp .env.example .env
# 3. Migrate + seed (NÃO usa Docker):
make setup-local
# (Windows sem make: cd backend && uv sync && uv run python manage.py migrate
#                     && uv run python manage.py seed_admin)
```

Depois suba `make backend` + `make front` normalmente.

Login default: `admin@instituicao.edu.br` / `admin123`
(sobrescreva via `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` no `.env`).

## Comandos úteis

```bash
make test         # pytest com cobertura
make db-shell     # psql no container
make reset        # apaga o volume e zera o banco
make logs         # tail nos logs do Postgres
```

---

## Arquitetura (resumo)

```
projeto_modulo1/
├── docker-compose.yml        # Postgres 16-alpine, volume nomeado
├── .env / .env.example       # credenciais + portas + secret_key
├── Makefile                  # alvos comuns
├── backend/                  # Django + DRF + simplejwt
│   └── autenticacao/         # app dedicado (ADR-01) — models, perms, seed
└── frontend/                 # Vite + React 18 + TS estrito + Tailwind + IFAM
    └── src/{api,store,routes,pages,layouts,components,types}
```

### Contrato de integração (o que outros RFs consomem)

```python
# 1. User model único do projeto
AUTH_USER_MODEL = "autenticacao.Usuario"

# 2. FK para usuário (em qualquer outro app):
from django.conf import settings
usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=...)

# 3. Criar usuário a partir do RF-02/RF-03:
from django.contrib.auth import get_user_model
get_user_model().objects.create_user(email=..., password=..., perfil=perfil_professor)

# 4. Proteger endpoints (RBAC):
from autenticacao.permissions import IsFuncionario, perfis_requeridos
permission_classes = [IsFuncionario]
# ou: permission_classes = [perfis_requeridos("Administrador", "Funcionario")]
```

### Contrato HTTP

`POST /api/auth/login/` — `{email, senha}` → `{access, refresh, usuario{id,email,perfil}}`
`POST /api/auth/refresh/` — `{refresh}` → `{access}`

Token de acesso: 2h. Token de refresh: 1 dia. Detalhes nos ADRs do CLAUDE.md.

---

## Desvios pontuais em relação ao CLAUDE.md

Documentados aqui para a equipe e para o merge final:

1. **`psycopg` v3** em vez de `psycopg2-binary`. Django 5.2 suporta ambos com o
   mesmo `ENGINE = "django.db.backends.postgresql"`. Psycopg 3 é o driver moderno
   e recomendado pelo próprio Django. Nenhuma mudança no schema ou na API.
2. **`docker-compose` para o Postgres** em vez do tutorial `CREATE DATABASE` via
   `psql` manual — exigência do usuário ("o banco precisa ser replicável em
   qualquer máquina"). O schema/usuário/senha continuam exatamente os do CLAUDE.md;
   só a forma de provisionamento mudou. O `.env` permite override de porta para
   evitar conflito local (esta máquina expõe em 5433 porque já tem outro Postgres
   em 5432; em uma máquina limpa, basta deixar 5432).
3. **`LoginSerializer` declara `senha` como CharField explícito** em vez de
   renomear via `self.fields["senha"] = self.fields.pop("password")`. O truque do
   pop+set não rebinda o `field_name` corretamente em versões atuais do DRF
   (3.17), o que causa `KeyError: 'senha'` em runtime. A solução é equivalente
   ao olhar do contrato (mesmo request/response) e está coberta pelos testes.
4. **`SECRET_KEY` default >= 32 bytes** para silenciar `InsecureKeyLengthWarning`
   do PyJWT — não tem impacto no contrato.
5. **shadcn/ui CLI não foi rodado**. Componentes `Button`, `Input`, `Label` foram
   escritos diretamente com Tailwind, seguindo a estética shadcn. Se a turma
   convergir para o CLI oficial, é trivial trocar (sem mudar consumidores).

---

## Definition of Done — status atual

- [x] `migrate` cria `usuario` e `perfil_acesso`; seed insere os 3 perfis.
- [x] `seed_admin` cria admin com perfil `Administrador` (idempotente).
- [x] `POST /api/auth/login/` responde o contrato (com `usuario.perfil`).
- [x] Credenciais erradas / usuário inativo → `401`.
- [x] Access token expira em 2h (testado via decode do JWT).
- [x] `PROTECT` impede excluir perfil com usuário vinculado.
- [x] Endpoint protegido sem token → `401`.
- [x] Permission classes `IsProfessor`/`IsFuncionario`/`IsAdministrador` testadas.
- [x] Front: login + token persistido + rota privada + interceptador de refresh.
- [x] Suite de testes do backend passando (25/25, 98% cobertura).
- [ ] E2E Cypress do fluxo de login — *pendente*, próxima entrega.
