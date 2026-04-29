@echo off
cd /d %~dp0
 echo Python edge-tts kurulumu basliyor...
py -3 -m pip install --upgrade edge-tts
if %ERRORLEVEL% EQU 0 goto OK
python -m pip install --upgrade edge-tts
if %ERRORLEVEL% EQU 0 goto OK
python3 -m pip install --upgrade edge-tts
if %ERRORLEVEL% EQU 0 goto OK
echo.
echo Kurulum basarisiz oldu. Python kurulu olmayabilir.
echo Python kurduktan sonra bu dosyayi tekrar calistir.
pause
exit /b 1
:OK
echo.
echo edge-tts kurulumu tamamlandi. Backend'i kapatip yeniden baslatin.
pause
