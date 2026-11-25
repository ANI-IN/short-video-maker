@echo off
rem One-time setup on Windows (the work is done by install.py).   Usage: setup.cmd
cd /d "%~dp0"
py -3.12 -V >/dev/null 2>nul
if %errorlevel%==0 (py -3.12 install.py %*) else (python install.py %*)
