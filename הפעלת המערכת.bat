@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo לא נמצא Node.js על המחשב הזה.
  echo יש להתקין אותו קודם מהאתר https://nodejs.org ^(הכפתור הירוק הגדול^), ולאחר מכן להריץ את הקובץ הזה שוב.
  echo.
  pause
  exit /b
)

echo.
echo מפעיל את מערכת ניהול ההזמנות...
echo אל תסגרו את החלון הזה כל עוד רוצים שהמערכת תישאר זמינה בדפדפן.
echo כדי לכבות את המערכת - פשוט סוגרים את החלון הזה.
echo.

start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"
node server.js

pause
