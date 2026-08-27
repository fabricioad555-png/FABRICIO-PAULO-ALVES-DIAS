@echo off
setlocal
title Sentinela Cripto - Terminal de Operacao

REM Sobe o terminal e cria o endereco de acesso de fora de casa.
REM
REM Por que precisa rodar aqui: a chave da Binance tem permissao de Futuros, e
REM a Binance obriga trava de IP nesse caso. Os pedidos tem de sair do IP desta
REM casa, entao quem fala com a corretora e sempre este computador.
REM
REM O endereco do tunel muda a cada arranque. Nao e preciso decorar: ele e
REM anunciado sozinho, e a pagina fixa da Vercel mostra o caminho.

cd /d "%~dp0"

echo.
echo  ================================================
echo   Sentinela Cripto
echo  ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERRO] O Node.js nao esta instalado.
  echo         Baixe em https://nodejs.org e instale a versao LTS.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  Primeira vez: instalando dependencias. Demora alguns minutos.
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo  [ERRO] Instalacao falhou. & pause & exit /b 1 )
)

echo  Preparando a aplicacao...
call npm run build
if errorlevel 1 ( echo  [ERRO] Falha ao preparar. & pause & exit /b 1 )

echo.
echo  Subindo o servidor...
start "Sentinela - Servidor" cmd /c "npm start"

echo  Aguardando o servidor responder...
:esperar
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000/ 2>nul
if errorlevel 1 goto esperar

echo.
echo  ------------------------------------------------
echo   Servidor no ar.
echo.
echo   Neste computador:  http://localhost:3000
echo   Na rede de casa:   http://192.168.1.215:3000
echo.
echo   O endereco de fora aparece abaixo em instantes,
echo   e tambem no botao "Abrir terminal" da pagina:
echo   https://fabricio-paulo-alves-dias.vercel.app
echo.
echo   Deixe as DUAS janelas abertas enquanto usar.
echo  ------------------------------------------------
echo.

start "" http://localhost:3000
node tunel.mjs

echo.
echo  O tunel foi encerrado.
pause
