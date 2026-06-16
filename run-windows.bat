@echo off
chcp 65001 >nul
title قياسات - Qiyasat
cd /d "%~dp0"

REM التحقق من Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [خطأ] لم يتم العثور على Node.js
  echo نزّل وثبّت Node.js من: https://nodejs.org/
  echo ثم أعد تشغيل هذا الملف.
  echo.
  pause
  exit /b 1
)

node boot.js
pause
