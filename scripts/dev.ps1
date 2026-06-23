<#
.SYNOPSIS
    Sobe backend (Django) e frontend (Vite) em duas janelas separadas do PowerShell.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "cd '$root\backend'; uv run python manage.py runserver 0.0.0.0:8000"
)

Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "cd '$root\frontend'; npm run dev"
)

Write-Host "Backend  -> http://localhost:8000/" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:5173/" -ForegroundColor Green
Write-Host ""
Write-Host "Feche cada janela para parar os servidores." -ForegroundColor Gray
