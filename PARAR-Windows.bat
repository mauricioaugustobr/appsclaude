@echo off
chcp 65001 >nul
title Parar Compressor de Videos
cd /d "%~dp0"
echo Parando a aplicacao...
docker compose down
echo.
echo Aplicacao parada. Pode fechar esta janela.
pause
