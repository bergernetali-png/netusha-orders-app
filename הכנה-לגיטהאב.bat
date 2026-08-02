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
  echo Please download and install "Git for Windows" from https://git-scm.com/download/win
  echo ^(just click Next through the installer with default options^), then run this file again.
  echo.
  pause
  exit /b 1
)
goto init

:gitfound
set "GIT=git"

:init
echo Using git: %GIT%
echo.

if exist ".git" (
  echo Removing old .git folder...
  rmdir /s /q ".git"
)

echo Initializing repository...
"%GIT%" init -q
"%GIT%" add .
"%GIT%" -c user.email=netusha@local -c user.name=NETUSHA commit -q -m "Initial commit - all project files"

echo.
echo Done! You can close this window now.
echo Next step: open GitHub Desktop, choose File - Add local repository, and select this folder.
echo.
pause
