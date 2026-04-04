# Tesseract-OCR Setup Guide

This guide helps you install Tesseract-OCR for the marksheet upload feature to work properly.

## What is Tesseract?

Tesseract-OCR is an open-source optical character recognition (OCR) engine. The Python package `pytesseract` is just a wrapper - you need the actual Tesseract software installed on your system.

**Error you're seeing:** "Tesseract is not installed or it's not in your PATH"

## Installation by Operating System

### Windows (Recommended Method)

#### Step 1: Download Installer
1. Visit: https://github.com/UB-Mannheim/tesseract/wiki/Downloads
2. Download the latest **Windows installer** (e.g., `tesseract-ocr-w64-setup-v5.x.exe`)

#### Step 2: Run Installer
1. Double-click the installer
2. Click "Install"
3. ⚠️ **IMPORTANT**: Note the installation path
   - Default: `C:\Program Files\Tesseract-OCR`
   - If you install elsewhere, remember the path

#### Step 3: Verify Installation
Open PowerShell and type:
```powershell
tesseract --version
```

You should see version info. If not, continue to Step 4.

#### Step 4: Add to PATH (if needed)
If `tesseract --version` doesn't work:

1. **Open Environment Variables**:
   - Press `Win + X` → Select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables..." button

2. **Add Tesseract to PATH**:
   - Under "System variables", find and click "Path"
   - Click "Edit..."
   - Click "New"
   - Add: `C:\Program Files\Tesseract-OCR` (or your install path)
   - Click "OK" on all dialogs

3. **Restart Flask App**:
   ```powershell
   # Stop Flask (Ctrl+C in terminal)
   # Then restart it:
   python app.py
   ```

#### Step 5: Verify Again
```powershell
tesseract --version
```

If you see version info, you're good!

### macOS

```bash
brew install tesseract
```

Verify:
```bash
tesseract --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install tesseract-ocr
```

Verify:
```bash
tesseract --version
```

### Linux (CentOS/RHEL)

```bash
sudo yum install tesseract
```

Verify:
```bash
tesseract --version
```

## Troubleshooting

### "tesseract is not found"
- Check PATH environment variable
- Reinstall from scratch
- Close and reopen your terminal/IDE after installation

### Still not working?
1. Check installation location: `C:\Program Files\Tesseract-OCR\tesseract.exe` should exist
2. Try full path in Python:
   ```python
   import pytesseract
   pytesseract.pytesseract.pytesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```

### Image OCR not working
- Make sure the image is clear and well-lit
- Text should be horizontal (not rotated or at angles)
- Minimum resolution: 200x200 pixels (bigger is better)
- Try a clearer image

## Quick Test

After installation, test image uploading:

1. Take a photo of a text document (clear, well-lit)
2. Go to upload tab in app
3. Upload the image
4. If extraction works, Tesseract is properly installed!

## Tips for Better OCR

- **High quality**: Clear, sharp images give better results
- **Lighting**: Ensure text is clearly visible
- **Orientation**: Make sure text isn't rotated
- **Resolution**: Larger images (300px+ width) work better
- **Contrast**: High contrast between text and background helps

## Alternative

If OCR for images isn't working after installation, you can:
- Upload PDF files instead (PDF text extraction doesn't need Tesseract)
- Manually enter the marksheet data using "Add Subject"

## Success!

Once installed and working, you'll be able to:
- ✅ Upload marksheet images (JPG, PNG, etc.)
- ✅ Automatically extract subjects and grades
- ✅ Review and correct extracted data
- ✅ Import directly to CGPA calculator

---

**Need help?** Check the README.md for additional troubleshooting.
