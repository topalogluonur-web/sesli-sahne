@echo off
cd /d "%~dp0backend"
echo === Windows sesleri ===
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { Write-Host ($_.VoiceInfo.Culture.Name + ' | ' + $_.VoiceInfo.Gender + ' | ' + $_.VoiceInfo.Name) }; $s.Dispose()"
echo.
echo Eger tr-TR ile baslayan bir ses yoksa Turkce ses paketi kurulu degildir.
pause
