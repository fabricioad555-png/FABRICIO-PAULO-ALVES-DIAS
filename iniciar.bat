@echo off
setlocal
title Sentinela Cripto - Terminal

REM Sobe o terminal nesta maquina.
REM
REM Precisa rodar aqui, e nao na nuvem, porque a chave da Binance so aceita
REM pedidos vindos do IP desta casa. Na Vercel o IP muda a cada arranque e a
REM Binance recusa com o erro -2015.

cd /d "%~dp0"

echo.
echo  ================================================
echo   Sentinela Cripto
echo  ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERRO] O Node.js nao esta instalado nesta maquina.
  echo         Baixe em https://nodejs.org e instale a versao LTS.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo  Primeira vez: instalando as dependencias. Isso demora alguns minutos.
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [ERRO] A instalacao falhou. Verifique a conexao com a internet.
    pause
    exit /b 1
  )
)

echo  Preparando a aplicacao...
call npm run build
if errorlevel 1 (
  echo.
  echo  [ERRO] Falha ao preparar a aplicacao.
  pause
  exit /b 1
)

echo.
echo  ------------------------------------------------
echo   Pronto. Abrindo no navegador.
echo.
echo   Neste computador:  http://localhost:3000
echo   Em outro da casa:  http://192.168.1.215:3000
echo.
echo   Deixe ESTA JANELA ABERTA enquanto usar.
echo   Para desligar, feche esta janela.
echo  ------------------------------------------------
echo.

start "" http://localhost:3000
call npm start

echo.
echo  O servidor foi encerrado.
pause
