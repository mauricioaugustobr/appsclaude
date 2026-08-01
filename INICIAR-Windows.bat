@echo off
chcp 65001 >nul
title Compressor e Conversor de Videos
cd /d "%~dp0"

echo ============================================================
echo   Compressor e Conversor de Videos
echo ------------------------------------------------------------
echo   Iniciando... a PRIMEIRA vez pode demorar alguns minutos
echo   (ele baixa e prepara tudo, incluindo o FFmpeg).
echo.
echo   Quando aparecer a palavra "Running" ou parar de rolar
echo   texto, abra o navegador em:
echo.
echo        http://localhost:8080
echo.
echo   Login inicial:  admin@empresa.com  /  admin123
echo ============================================================
echo.

REM Verifica se o Docker esta instalado
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERRO] O Docker nao foi encontrado.
  echo Instale o Docker Desktop em https://www.docker.com/products/docker-desktop/
  echo e abra o Docker Desktop antes de rodar este atalho.
  echo.
  pause
  exit /b 1
)

REM Abre o navegador automaticamente apos 30 segundos (em segundo plano)
start "" cmd /c "timeout /t 30 /nobreak >nul & start "" http://localhost:8080"

REM Sobe a aplicacao
docker compose up --build

echo.
echo Aplicacao encerrada. Voce pode fechar esta janela.
pause
