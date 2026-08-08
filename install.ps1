# OmniParse CLI Beta 1-Line Installer for Windows
Write-Host "Installing OmniParse CLI..." -ForegroundColor Cyan

python -m pip install --upgrade git+https://github.com/ManvithReddyyy/OmniParse.git

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOmniParse CLI successfully installed!" -ForegroundColor Green
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  omniparse document.pdf stdout -l eng"
    Write-Host "  omniparse slide.pptx output.md -l japan --translate en`n"
} else {
    Write-Host "`nInstallation failed. Make sure Python & Git are installed." -ForegroundColor Red
}
