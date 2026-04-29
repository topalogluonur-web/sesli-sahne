@echo off
setlocal
cd /d "%~dp0"

echo.
echo === SESLI SAHNE - GIT INIT AND COMMIT ===
echo Folder: %CD%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not found.
  exit /b 1
)

if not exist ".git" (
  echo [INFO] Initializing git repository...
  git init
)

git branch -M main

echo.
echo [INFO] Adding files...
git add .

echo.
echo [INFO] Git status:
git status --short

echo.
echo [INFO] Creating commit...
git commit -m "v34 cloud readiness for Render deploy"

if errorlevel 1 (
  echo.
  echo [WARN] Commit could not be created.
  echo Possible reasons:
  echo - Nothing new to commit
  echo - Git user.name or user.email is missing
  echo.
  echo If identity is missing, run:
  echo git config --global user.name "Kaya Ozdemir"
  echo git config --global user.email "your-email@example.com"
  exit /b 1
)

echo.
echo [OK] Commit created:
git log --oneline -1

echo.
echo Next commands after creating GitHub repo:
echo git remote add origin https://github.com/YOUR_USERNAME/sesli-sahne.git
echo git push -u origin main

exit /b 0