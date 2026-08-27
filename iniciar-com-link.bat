@echo off
setlocal
title Sentinela Cripto - Servidor + Link Publico

REM Sobe o terminal e cria um link publico para acessar de fora de casa.
REM
REM Por que precisa disso: a chave da Binance tem permissao de Futuros, e a
REM Binance obriga trava de IP em chave com Futuros. Os pedidos precisam sair
REM do IP desta casa. O tunel resolve: o link e publico, mas quem fala com a
REM Binance continua sendo este computador.

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
echo   O LINK PUBLICO vai aparecer na outra janela que
echo   esta abrindo agora, dentro de uma moldura,
echo   terminando em .trycloudflare.com
echo.
echo   Esse endereco MUDA toda vez que voce roda isto.
echo   Deixe as DUAS janelas abertas enquanto usar.
echo  ------------------------------------------------
echo.

start "" http://localhost:3000
npx --yes cloudflared tunnel --url http://localhost:3000 --no-autoupdate

echo.
echo  O tunel foi encerrado.
pause
