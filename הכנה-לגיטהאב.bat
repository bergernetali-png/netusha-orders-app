@echo off
setlocal
cd /d "%~dp0"

echo Checking for git...
git --version >nul 2>nul
if %errorlevel%==0 goto gitfound

set "GIT="
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-ChildItem -Path $env:LOCALAPPDATA\GitHubDesktop -Recurse -Filter git.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName"') do set "GIT=%%i"

if "%GIT%"=="" (
  echo.
  echo Git was not found on this computer.
  pause
  exit /b 1
)
goto init

:gitfound
set "GIT=git"

:init
echo Using git: %GIT%
echo.

if exist ".git\index.lock" (
  echo Removing stuck lock file...
  del /f /q ".git\index.lock" 2>nul
)

if exist "netusha-orders" (
  echo Removing stray folder: netusha-orders
  rmdir /s /q "netusha-orders" 2>nul
)
if exist "אפליקצית הזמנות" (
  echo Removing stray nested folder
  rmdir /s /q "אפליקצית הזמנות" 2>nul
)

echo Staging and committing all changes...
"%GIT%" -c user.email=netusha@local -c user.name=NETUSHA add -A
"%GIT%" -c user.email=netusha@local -c user.name=NETUSHA commit -q -m "Update: mobile app-style navigation, PWA icon"
if %errorlevel%==1 echo (Nothing new to commit, or already committed - continuing anyway)

echo.
echo Pushing to GitHub...
"%GIT%" push origin main

echo.
echo If a browser window or sign-in popup appeared, sign in there to complete the push.
echo Done! Check your GitHub page - the new files should be there now.
echo Railway will pick this up and redeploy automatically within a minute or two.
echo.
pause
