#!/usr/bin/env sh
# OmniParse CLI Beta 1-Line Installer for Linux/macOS

echo "Installing OmniParse CLI..."
python3 -m pip install --upgrade git+https://github.com/ManvithReddyyy/OmniParse.git

if [ $? -eq 0 ]; then
    echo "\nOmniParse CLI successfully installed!"
    echo "Usage:"
    echo "  omniparse document.pdf stdout -l eng"
    echo "  omniparse slide.pptx output.md -l japan --translate en\n"
else
    echo "\nInstallation failed. Make sure Python 3 & Git are installed."
fi
