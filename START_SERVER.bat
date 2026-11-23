@echo off
title PulseCare Telehealth — Local Development Server
echo ============================================================
echo   PulseCare Telehealth — Portal Self-Assessment Pasien v2.0
echo ============================================================
echo.
echo Menjalankan server lokal di http://localhost:8000/#welcome ...
echo (Tekan Ctrl+C untuk menghentikan server)
echo.
start "" "http://localhost:8000/#welcome"
python -m http.server 8000
pause
