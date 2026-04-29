@echo off
setlocal
cd /d "%~dp0"

echo.
echo === SESLI SAHNE - CLOUD READINESS CHECK ===
echo Folder: %CD%
echo.

set ERR=0
set WARN=0

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  set /a ERR+=1
) else (
  for /f "delims=" %%v in ('node -v') do echo [OK] Node: %%v
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found.
  set /a ERR+=1
) else (
  for /f "delims=" %%v in ('npm -v') do echo [OK] npm: %%v
)

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not found.
  set /a ERR+=1
) else (
  for /f "delims=" %%v in ('git --version') do echo [OK] %%v
)

echo.
echo --- Project files ---

if exist backend\package.json (
  echo [OK] backend/package.json found
) else (
  echo [ERROR] backend/package.json not found
  set /a ERR+=1
)

if exist backend\src\server.js (
  echo [OK] backend/src/server.js found
) else (
  echo [ERROR] backend/src/server.js not found
  set /a ERR+=1
)

if exist admin\package.json (
  echo [OK] admin/package.json found
) else (
  echo [WARN] admin/package.json not found
  set /a WARN+=1
)

if exist mobile\package.json (
  echo [OK] mobile/package.json found
) else (
  echo [WARN] mobile/package.json not found
  set /a WARN+=1
)

if exist render.yaml (
  echo [OK] render.yaml found
) else (
  echo [ERROR] render.yaml not found
  set /a ERR+=1
)

if exist .gitignore (
  echo [OK] .gitignore found
) else (
  echo [WARN] .gitignore not found
  set /a WARN+=1
)

echo.
echo --- Backend cloud checks ---

findstr /S /I /N "api/health" backend\*.js backend\*.ts >nul 2>nul
if errorlevel 1 (
  echo [WARN] api/health not found
  set /a WARN+=1
) else (
  echo [OK] api/health appears to exist
)

findstr /S /I /N "process.env.PORT" backend\*.js backend\*.ts >nul 2>nul
if errorlevel 1 (
  echo [WARN] process.env.PORT not found
  set /a WARN+=1
) else (
  echo [OK] process.env.PORT appears to be used
)

findstr /S /I /N "DATABASE_PATH" backend\*.js backend\*.ts >nul 2>nul
if errorlevel 1 (
  echo [WARN] DATABASE_PATH not found
  set /a WARN+=1
) else (
  echo [OK] DATABASE_PATH appears to be used
)

echo.
echo === RESULT ===
echo Errors: %ERR%
echo Warnings: %WARN%

if %ERR% GTR 0 (
  echo.
  echo [FAIL] Fix errors before deploy.
  exit /b 1
)

echo.
echo [OK] Check completed. You can continue with git commit.
exit /b 0