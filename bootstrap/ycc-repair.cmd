@echo off
setlocal
set "TMP=%TEMP%\ycc-salon-rescue-poller.ps1"
gh api "repos/yanivmizrachiy/ma-assistant2/contents/scripts/windows/salon-rescue-poller.ps1?ref=main" -H "Accept: application/vnd.github.raw+json" > "%TMP%"
if errorlevel 1 exit /b 11
pwsh.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%TMP%" -RepoRoot "%USERPROFILE%\.ycc-runtime\ma-assistant2-main"
exit /b %errorlevel%
