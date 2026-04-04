@echo off
REM Check Tesseract Installation Status
REM Windows Diagnostic Script

echo.
echo ======================================
echo  Tesseract-OCR Installation Check
echo ======================================
echo.

REM Check if tesseract is in PATH
tesseract --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tesseract found in PATH
    echo.
    echo Tesseract Version:
    tesseract --version
    echo.
) else (
    echo [ERROR] Tesseract NOT found in PATH
    echo.
    echo Checking common installation locations...
    echo.
    
    if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
        echo [FOUND] C:\Program Files\Tesseract-OCR\tesseract.exe
        echo.
        echo Solution: Add to PATH
        echo 1. Press Win + X
        echo 2. Click "System"
        echo 3. Click "Advanced system settings"
        echo 4. Click "Environment Variables"
        echo 5. Edit "Path" variable
        echo 6. Add: C:\Program Files\Tesseract-OCR
        echo 7. Restart Flask app
        echo.
    )
    
    if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" (
        echo [FOUND] C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
        echo.
        echo Solution: Add to PATH
        echo 1. Press Win + X
        echo 2. Click "System"
        echo 3. Click "Advanced system settings"
        echo 4. Click "Environment Variables"
        echo 5. Edit "Path" variable
        echo 6. Add: C:\Program Files (x86)\Tesseract-OCR
        echo 7. Restart Flask app
        echo.
    )
    
    if not exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
        if not exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" (
            echo [NOT FOUND] Tesseract is not installed
            echo.
            echo To install Tesseract:
            echo 1. Visit: https://github.com/UB-Mannheim/tesseract/wiki/Downloads
            echo 2. Download the Windows installer
            echo 3. Run the installer
            echo 4. Run this script again
            echo.
        )
    )
)

echo.
echo Checking Python pytesseract package...
python -c "import pytesseract; print('[OK] pytesseract package installed')" 2>nul
if %errorlevel% equ 0 (
    echo.
) else (
    echo [ERROR] pytesseract Python package NOT found
    echo Install it with: pip install pytesseract
    echo.
)

echo.
echo ======================================
echo  End of Check
echo ======================================
echo.

pause
