@echo off
cd /d "%~dp0"
if not exist cloud-data mkdir cloud-data
if not exist cloud-data\data mkdir cloud-data\data
if not exist cloud-data\uploads mkdir cloud-data\uploads
docker compose -f docker-compose.cloud-local.yml up --build
pause
