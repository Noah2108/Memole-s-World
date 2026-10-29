@echo off
title Memole's World
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installa Node.js LTS e riapri questo file. Leggi AVVIO-WINDOWS.md.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Preparazione delle dipendenze...
  call npm.cmd ci
  if errorlevel 1 (
    echo Preparazione non riuscita. Consulta AVVIO-WINDOWS.md.
    pause
    exit /b 1
  )
)
call npm.cmd run doctor
if errorlevel 1 (
  echo.
  echo Mancano strumenti per l'app desktop. Leggi AVVIO-WINDOWS.md.
  echo Nessun browser viene aperto da questo avvio desktop.
  pause
  exit /b 1
)
call npm.cmd run desktop:dev
if errorlevel 1 pause
