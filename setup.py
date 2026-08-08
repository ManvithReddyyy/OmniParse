from setuptools import setup

setup(
    name="omniparse-cli",
    version="0.1.0-beta.1",
    py_modules=["omniparse"],
    install_requires=[
        "requests>=2.28.0",
    ],
    entry_points={
        "console_scripts": [
            "omniparse=omniparse:main",
        ],
    },
)
