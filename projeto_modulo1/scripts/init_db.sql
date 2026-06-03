-- =============================================================================
-- init_db.sql — Bootstrap do banco SEM Docker (Postgres instalado localmente)
-- =============================================================================
-- Use este script quando o Docker NÃO estiver disponível na máquina (ex.: na
-- avaliação do professor). Ele reproduz, num Postgres instalado nativamente, o
-- mesmo banco/usuário/permissões que o docker-compose.yml cria automaticamente.
--
-- COMO RODAR:
--   * psql (recomendado p/ este arquivo, por causa do \gexec):
--         psql -U postgres -h localhost -f scripts/init_db.sql
--   * pgAdmin: prefira o passo a passo via interface em docs/SETUP_PGADMIN.md.
--         (O Query Tool do pgAdmin NÃO entende \gexec, e CREATE DATABASE não
--          pode rodar junto de outros comandos numa mesma transação — por isso
--          o tutorial cria o banco pela GUI e roda só o bloco de role por SQL.)
--
-- Depois disso, ajuste o .env (DB_HOST/DB_PORT apontando para o Postgres local)
-- e rode as migrations:  make setup-local   (ou os comandos manuais do README).
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Credenciais batem com o .env.example (troque em produção).
-- =============================================================================

-- 1) Usuário/role da aplicação ------------------------------------------------
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'user_modulo1') THEN
        CREATE ROLE user_modulo1 LOGIN PASSWORD 'senha123';
    END IF;
END
$$;

-- Garante a senha mesmo se o role já existia (ex.: rodar de novo).
ALTER ROLE user_modulo1 WITH LOGIN PASSWORD 'senha123';

-- Defaults de sessão (espelham o ALTER ROLE do CLAUDE.md / TZ do container).
ALTER ROLE user_modulo1 SET client_encoding TO 'utf8';
ALTER ROLE user_modulo1 SET timezone TO 'America/Sao_Paulo';

-- CRÍTICO: a suite de testes (pytest-django) cria um banco "test_..." em cada
-- rodada. No Docker o usuário era superuser e podia criar bancos; aqui damos
-- explicitamente o privilégio CREATEDB para que `make test` funcione sem Docker.
ALTER ROLE user_modulo1 WITH CREATEDB;

-- 2) Banco da aplicação -------------------------------------------------------
-- OWNER = user_modulo1 resolve, de uma vez, as permissões de schema do
-- Postgres 15+ (onde CREATE no schema public não é mais concedido por padrão).
-- Sendo dono do banco, o usuário cria as tabelas das migrations sem GRANT extra.
-- (CREATE DATABASE não roda dentro de DO/IF; por isso o teste vem via \gexec.)
SELECT 'CREATE DATABASE modulo1_alocacao OWNER user_modulo1'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'modulo1_alocacao')
\gexec

GRANT ALL PRIVILEGES ON DATABASE modulo1_alocacao TO user_modulo1;

-- =============================================================================
-- Pronto. Verifique com:  \l modulo1_alocacao   e   \du user_modulo1
-- =============================================================================
