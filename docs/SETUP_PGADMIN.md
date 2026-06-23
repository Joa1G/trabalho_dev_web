# Setup do banco SEM Docker — Postgres local + pgAdmin

> **Quando usar este guia:** se o Docker **não** estiver disponível ou não
> funcionar na máquina onde o projeto vai rodar (ex.: na avaliação). Em vez do
> Postgres em container, usamos um **PostgreSQL instalado nativamente** e o
> **pgAdmin** para administrá-lo.
>
> O Django não muda em nada: ele lê a conexão do `.env` (`DB_HOST`, `DB_PORT`,
> `DB_NAME`, `DB_USER`, `DB_PASSWORD`). Trocar Docker por Postgres local é só
> apontar essas variáveis para o servidor certo. O objetivo deste guia é
> reproduzir, na mão, o que o `docker-compose.yml` fazia sozinho: **criar o
> banco, o usuário e dar as permissões**.

---

## 0. O que instalar

O instalador oficial do PostgreSQL para Windows/macOS já **inclui o pgAdmin** e o
`psql`. Baixe em <https://www.postgresql.org/download/> e instale o **PostgreSQL
14 ou superior** (o projeto foi validado no 16).

Durante a instalação você define a senha do superusuário **`postgres`** —
**anote-a**, vamos precisar dela no primeiro acesso do pgAdmin. A porta padrão é
**5432**.

---

## 1. Conectar no servidor pelo pgAdmin

1. Abra o **pgAdmin**. Na primeira vez ele pede uma *master password* (senha do
   próprio pgAdmin, só para guardar conexões) — defina qualquer uma.
2. No painel **Object Explorer** (esquerda), expanda **Servers**. Em geral já
   existe um servidor **"PostgreSQL 16"** criado pelo instalador.
   - Se **não** existir, clique com o botão direito em **Servers → Register →
     Server…** e preencha:
     - Aba **General → Name:** `Local` (qualquer nome).
     - Aba **Connection:**
       - **Host name/address:** `localhost`
       - **Port:** `5432`
       - **Maintenance database:** `postgres`
       - **Username:** `postgres`
       - **Password:** a senha do `postgres` definida na instalação (marque
         *Save password*).
     - **Save**.
3. Clique no servidor e digite a senha do `postgres` se for pedida. Conectado. ✅

---

## 2. Criar o usuário da aplicação (`user_modulo1`)

Vamos criar o role que o Django usa para logar no banco. **Via SQL é o mais
rápido e à prova de erro:**

1. Com o servidor selecionado, abra o **Query Tool** (ícone de raio, ou botão
   direito no servidor → **Query Tool**).
2. Cole e execute (**F5**) **apenas este bloco**:

   ```sql
   -- cria o role só se ainda não existir (idempotente)
   DO
   $$
   BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'user_modulo1') THEN
           CREATE ROLE user_modulo1 LOGIN PASSWORD 'senha123';
       END IF;
   END
   $$;

   ALTER ROLE user_modulo1 WITH LOGIN PASSWORD 'senha123';
   ALTER ROLE user_modulo1 SET client_encoding TO 'utf8';
   ALTER ROLE user_modulo1 SET timezone TO 'America/Sao_Paulo';

   -- CREATEDB é obrigatório: a suite de testes (pytest) cria um banco "test_..."
   ALTER ROLE user_modulo1 WITH CREATEDB;
   ```

> **Por que CREATEDB?** No Docker o usuário do banco era superusuário e podia
> criar o banco de teste que o `pytest-django` exige. No Postgres local
> precisamos conceder isso explicitamente, senão `make test` falha com
> *"permission denied to create database"*.

---

## 3. Criar o banco (`modulo1_alocacao`) pela interface

`CREATE DATABASE` não pode rodar junto de outros comandos numa mesma transação,
então aqui a **GUI do pgAdmin é o caminho mais seguro** (sem pegadinhas):

1. Botão direito em **Databases → Create → Database…**
2. Aba **General:**
   - **Database:** `modulo1_alocacao`
   - **Owner:** `user_modulo1`  *(selecione no dropdown — por isso criamos o role
     antes; ser **dono** do banco resolve as permissões de schema do Postgres 15+
     automaticamente)*
3. **Save**.

> Prefere SQL? Conecte como `postgres`, abra o Query Tool e rode **sozinha** a
> linha: `CREATE DATABASE modulo1_alocacao OWNER user_modulo1;`

Pronto: o banco aparece na árvore em **Databases**.

---

## 4. Apontar o projeto para o Postgres local (`.env`)

Na raiz `projeto_modulo1/`, copie o exemplo e ajuste:

```bash
cp .env.example .env
```

Garanta que estas linhas batem com o seu Postgres local (a porta padrão de uma
instalação nativa é **5432**):

```dotenv
DB_NAME=modulo1_alocacao
DB_USER=user_modulo1
DB_PASSWORD=senha123
DB_HOST=localhost
DB_PORT=5432
```

> `DB_HOST_PORT` só importa no cenário com Docker (porta que o container expõe).
> Sem Docker, ignore essa variável e use `DB_PORT` para a porta do seu Postgres.

---

## 5. Criar as tabelas e o admin (migrations + seed)

Com banco e usuário prontos e o `.env` apontado, rode as migrations e o seed.
**Nenhum desses comandos usa Docker:**

```bash
# atalho (Linux/macOS, com make):
make bootstrap      # instala dependências (back + front), se ainda não rodou
make setup-local    # migrate + seed do admin, SEM Docker

# equivalente manual (qualquer SO):
cd backend
uv sync
uv run python manage.py migrate      # cria tabelas + seed dos 3 perfis
uv run python manage.py seed_admin   # cria o admin de dev
```

No Windows sem `make`, use os comandos manuais acima (o `uv` resolve o Python).

Login default criado pelo seed: **`admin@instituicao.edu.br` / `admin123`**.

---

## 6. Subir a aplicação

```bash
make backend   # Django em http://localhost:8000
make front     # Vite  em http://localhost:5173

# ou manualmente:
cd backend  && uv run python manage.py runserver 0.0.0.0:8000
cd frontend && npm install && npm run dev
```

Teste o login em <http://localhost:5173> ou direto na API:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instituicao.edu.br","senha":"admin123"}'
```

---

## 7. Inspecionar os dados no pgAdmin (opcional)

Para conferir o que o Django criou:

- **Databases → modulo1_alocacao → Schemas → public → Tables** — você verá
  `usuario`, `perfil_acesso` e as tabelas internas do Django.
- Botão direito em uma tabela → **View/Edit Data → All Rows**. Em `perfil_acesso`
  devem estar os 3 perfis (`Administrador`, `Professor`, `Funcionario`); em
  `usuario`, o admin seedado.
- Para rodar SQL ad-hoc, **selecione o banco `modulo1_alocacao`** e abra o
  **Query Tool** (ex.: `SELECT email, perfil_id FROM usuario;`).

---

## Solução de problemas

| Sintoma | Causa provável | Correção |
| :-- | :-- | :-- |
| `connection refused` / `could not connect` | Serviço do Postgres parado, ou `DB_PORT` errado | Confirme o serviço rodando e a porta no `.env` (padrão 5432). |
| `password authentication failed for user "user_modulo1"` | Senha do `.env` ≠ senha do role | Rode de novo o `ALTER ROLE user_modulo1 ... PASSWORD 'senha123';` ou alinhe o `.env`. |
| `permission denied to create database` (no `pytest`) | Faltou `CREATEDB` no role | Rode `ALTER ROLE user_modulo1 WITH CREATEDB;` como `postgres`. |
| `permission denied for schema public` (no `migrate`) | Banco não pertence ao `user_modulo1` | Recrie o banco com **Owner = user_modulo1**, ou `ALTER DATABASE modulo1_alocacao OWNER TO user_modulo1;`. |
| `database "modulo1_alocacao" already exists` ao recriar | Banco já existe (inofensivo) | Ignore, ou apague pela GUI e recrie. |

---

### Resumo (TL;DR)

1. Instale o PostgreSQL (vem com pgAdmin).
2. No pgAdmin, conecte como `postgres`.
3. Rode o bloco de **role** do passo 2 (cria `user_modulo1` com `CREATEDB`).
4. Crie o banco `modulo1_alocacao` com **owner `user_modulo1`** (passo 3).
5. `.env` com `DB_HOST=localhost` e `DB_PORT=5432`.
6. `make setup-local` (ou `uv run python manage.py migrate && ... seed_admin`).
7. `make backend` + `make front`.
