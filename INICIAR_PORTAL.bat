@echo off
chcp 65001 >nul
title Portal Campeonato Quiterianopolis 2026
echo ============================================================
echo   PORTAL OFICIAL - CAMPEONATO DE QUITERIANOPOLIS 2026
echo   Acesse no navegador: http://localhost:3000
echo   Simulador Mobile:    http://localhost:3000/celular
echo ============================================================
cd /d "%~dp0"
start "" "http://localhost:3000"
node src\server.js
pause
