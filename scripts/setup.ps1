<#
.SYNOPSIS
    Setup completo do RF-01 no Windows (idempotente; pode rodar várias vezes).

.DESCRIPTION
    1. Confere pré-requisitos (Docker, uv, Node).
    2. Cria .env a partir de .env.example se faltar.
    3. Sobe o Postgres (docker compose) e espera ficar saudável.
    4. Sincroniza dependências (uv sync + npm install).
    5. Aplica migrations e seed do admin.
    6. Mostra os comandos para subir os dev servers.

.EXAMPLE
    # Em PowerShell, dentro de projeto_modulo1\
    powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
#>

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Ancora todos os paths na raiz do projeto, independente de onde foi chamado.
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    OK $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "    !! $msg" -ForegroundColor Yellow }
function Write-Fail($msg)  { Write-Host "    XX $msg" -ForegroundColor Red }

function Test-Cmd($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

# ---------------------------------------------------------------------------
Write-Step "Conferindo pré-requisitos"

$faltando = @()
if (-not (Test-Cmd 'docker')) { $faltando += 'Docker Desktop  -> https://www.docker.com/products/docker-desktop' }
if (-not (Test-Cmd 'uv'))     { $faltando += 'uv              -> winget install astral-sh.uv' }
if (-not (Test-Cmd 'node'))   { $faltando += 'Node 20 LTS     -> winget install OpenJS.NodeJS.LTS' }

if ($faltando.Count -gt 0) {
    Write-Fail "Faltam dependências:"
    $faltando | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    Write-Host "`nInstale e rode o script novamente." -ForegroundColor Red
    exit 1
}
Write-Ok "Docker, uv e Node disponíveis."

# Detecta `docker compose` (v2, moderno) ou `docker-compose` (v1, legacy)
$composeCmd = $null
$composeArgs = @()
& docker compose version *> $null
if ($LASTEXITCODE -eq 0) {
    $composeCmd = 'docker'
    $composeArgs = @('compose')
    Write-Ok "Usando 'docker compose' (v2)."
} elseif (Test-Cmd 'docker-compose') {
    $composeCmd = 'docker-compose'
    Write-Ok "Usando 'docker-compose' (v1)."
} else {
    Write-Fail "Nenhum compose disponível. Atualize o Docker Desktop."
    exit 1
}

# ---------------------------------------------------------------------------
Write-Step "Configurando .env"

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Ok ".env criado a partir de .env.example."
} else {
    Write-Ok ".env já existe (mantido)."
}

# ---------------------------------------------------------------------------
Write-Step "Subindo o Postgres (docker compose)"

& $composeCmd @composeArgs --env-file .env up -d --wait
if ($LASTEXITCODE -ne 0) {
    Write-Warn "'--wait' falhou (Compose antigo?). Subindo sem espera e polling no healthcheck."
    & $composeCmd @composeArgs --env-file .env up -d
    if ($LASTEXITCODE -ne 0) { Write-Fail "Falha ao subir o Postgres."; exit 1 }
    $tentativas = 0
    while ($tentativas -lt 30) {
        $status = & docker inspect --format '{{.State.Health.Status}}' modulo1_postgres 2>$null
        if ($status -eq 'healthy') { break }
        Start-Sleep -Seconds 1
        $tentativas++
    }
    if ($status -ne 'healthy') { Write-Fail "Postgres não ficou saudável em 30s."; exit 1 }
}
Write-Ok "Postgres saudável."

# ---------------------------------------------------------------------------
Write-Step "Backend: uv sync + migrate + seed admin"

Push-Location backend
try {
    & uv sync
    if ($LASTEXITCODE -ne 0) { throw "uv sync falhou." }
    Write-Ok "Dependências Python instaladas."

    & uv run python manage.py migrate
    if ($LASTEXITCODE -ne 0) { throw "migrate falhou." }
    Write-Ok "Migrations aplicadas (tabelas + 3 perfis seedados)."

    & uv run python manage.py seed_admin
    if ($LASTEXITCODE -ne 0) { throw "seed_admin falhou." }
    Write-Ok "Admin de dev pronto."
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
Write-Step "Frontend: npm install"

Push-Location frontend
try {
    & npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }
    Write-Ok "Dependências Node instaladas."
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==> Setup concluído." -ForegroundColor Green
Write-Host ""
Write-Host "Para rodar a aplicação, abra DOIS terminais:" -ForegroundColor White
Write-Host "  1) cd backend; uv run python manage.py runserver 0.0.0.0:8000" -ForegroundColor Gray
Write-Host "  2) cd frontend; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Acesse http://localhost:5173/ e logue com:" -ForegroundColor White
Write-Host "  admin@instituicao.edu.br / admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "Ou rode '.\scripts\dev.ps1' para subir os dois automaticamente." -ForegroundColor White
