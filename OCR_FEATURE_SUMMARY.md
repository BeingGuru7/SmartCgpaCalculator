# Smart CGPA Calculator - OCR Upload Feature

## Overview
The OCR (Optical Character Recognition) upload feature has been **successfully implemented** to allow users to automatically extract subject data from marksheet images and PDF files.

## ✅ Completed Components

### 1. **Backend Python Modules**
- **`utils/ocr.py`** - TextExtractor class with intelligent preprocessing
  - Validates files (size, type, existence)
  - Extracts text from PDF files using pdfplumber
  - Extracts text from images with OpenCV preprocessing (grayscale, denoise, threshold, morphological ops, upscaling)
  - Uses pytesseract for OCR with automatic error recovery

- **`utils/parser.py`** - MarksheetParser class with regex-based extraction
  - Extracts subject names using regex patterns
  - Extracts credits (handles multiple formats)
  - Extracts grades (O, A+, A, B+, B, C, D, F) with OCR error correction
  - Provides confidence scoring for each extraction (0-1)
  - Identifies and highlights low-confidence subjects (<70%)
  - Logs all errors and warnings for user review

### 2. **Flask API Endpoints**
- **POST `/api/upload`** - Main file upload endpoint
  - Accepts: Multipart form data with file (max 10MB)
  - Returns: JSON with extracted subjects, confidence scores, error count

- **POST `/api/extract-text`** - Raw text extraction endpoint
  - For viewing OCR output before parsing

- **POST `/api/validate-extracted-subjects`** - Validation endpoint
  - Validates user-corrected data before import
  - Returns normalized subjects ready for calculator

### 3. **Frontend HTML/CSS**
- **Upload Tab UI** (`templates/index.html`)
  - Drag-and-drop file upload interface
  - File input with supported format list
  - Loading state with spinner and status message
  - Extracted data preview table with:
    - Subject name (editable)
    - Credits (editable, numeric input)
    - Grade (editable, dropdown)
    - Confidence percentage (visual indicator)
    - Delete row button
  - Low-confidence warning message
  - "Upload Another" and "Import to Semesters" buttons
  - Raw text viewer (collapsible section)

- **CSS Styling** (`static/css/style.css`)
  - Complete responsive design for upload workflow
  - Upload area with drag-over visual feedback
  - Loading spinner animation
  - Preview table styling with hover effects
  - Confidence indicators (green for high, yellow for low)
  - Dark mode support

### 4. **JavaScript Event Handlers** (`static/js/app.js`)

#### File Handling Functions:
- `handleDragOver(event)` - Visual feedback when dragging files
- `handleDragLeave(event)` - Remove drag visual feedback
- `handleDrop(event)` - Process dropped files
- `handleFileSelect(event)` - Process selected files via input
- `uploadFile(file)` - Validates and uploads file to `/api/upload`
  - File size validation (max 10MB)
  - File type validation (PDF, JPEG, PNG, BMP, TIFF)
  - Shows loading state during processing

#### Data Display & Editing:
- `displayExtractedData(data)` - Renders preview table with editable fields
  - Shows confidence percentage for each subject
  - Highlights low-confidence subjects
  - Displays status warnings/info messages
  - Creates editable input fields for user correction

#### Data Management:
- `removeExtractedRow(idx)` - Delete individual subject from preview
- `resetUpload()` - Clear state and return to file upload screen
- `importExtractedData()` - Validate corrected data and add to calculator
  - Creates new semester
  - Recalculates CGPA
  - Switches to semesters tab
  - Shows success toast

#### Event Listeners (in `setupEventListeners()`):
- Drag-drop event listeners on upload area
- File input change listener
- Import button click listener
- Reset button click listener

### 5. **Dependencies Installed**
```
Flask==2.3.3
Flask-Cors==4.0.0
Werkzeug==2.3.7
pytesseract==0.3.13
pdfplumber==0.11.9
opencv-python==4.13.0.92
Pillow>=11.0
numpy>=2
```

## 🚀 How to Use

1. **Start the Flask app**:
   ```bash
   python app.py
   ```
   App runs on `http://localhost:5000`

2. **Navigate to Upload Tab**:
   - Click the "Upload Marksheet" tab in the app

3. **Upload a File**:
   - Drag and drop a marksheet image/PDF, OR
   - Click the upload area to select a file

4. **Review Extracted Data**:
   - Check the preview table for extracted subjects
   - Yellow-highlighted rows indicate low confidence (needs review)
   - Correct any incorrect data directly in the table

5. **Import to Calculator**:
   - Click "Import to Semesters" button
   - System validates and creates a new semester
   - CGPA is automatically recalculated
   - App switches to semesters view

6. **View Raw Text** (optional):
   - Click "View Raw Extracted Text" to see original OCR output

## ⚙️ Configuration

### File Upload Settings
- **Maximum file size**: 10 MB
- **Supported formats**: PDF, JPEG, PNG, BMP, TIFF
- **Upload location**: `tmp/` directory (auto-cleaned)

### OCR Settings
- **Tesseract path**: Auto-detected (installed separately)
- **Image preprocessing**:
  - Grayscale conversion
  - Denoising (bilateral filter)
  - Binary threshold
  - Morphological operations
  - 2x upscaling

### Confidence Scoring
- **Low confidence threshold**: < 0.70 (70%)
- **Triggers user review**: Yes (highlighted rows)
- **Can still import**: Yes (user can accept or correct)

## 📋 Workflow

```
Upload File
    ↓
File Validation (size, type)
    ↓
OCR Extraction (PDF or Image)
    ↓
Data Parsing (Regex-based)
    ↓
Display Preview with Confidence Scores
    ↓
User Review & Correction
    ↓
Import Validation
    ↓
Add to CGPA Calculator
    ↓
Update Display
```

## 🔍 Testing

### Test Case 1: Simple PDF Upload
1. Upload a clear PDF marksheet
2. Verify all subjects are extracted correctly
3. Import to calculator

### Test Case 2: Blurry Image Upload
1. Upload a low-quality image
2. Observe confidence scores
3. Correct any misread subjects
4. Import successfully

### Test Case 3: Drag-Drop Upload
1. Drag file from file explorer
2. Drop on upload area
3. Verify upload starts

### Test Case 4: Edit Extracted Data
1. Upload marksheet
2. Modify subject names/credits/grades in preview
3. Delete unnecessary rows
4. Import modified data

## 🐛 Error Handling

- **File too large**: Toast message, no upload
- **Unsupported format**: Toast message, no upload
- **OCR failure**: User-friendly error message with suggestion to try different file
- **Missing fields**: Validation error with specific issues
- **Network error**: Caught and displayed as toast notification

## 📝 Notes

- All extracted data stays in preview until explicitly imported
- Users can correct data before import (no automatic save)
- Low-confidence subjects are highlighted but can still be imported
- Original file is deleted after processing
- Raw OCR text can be reviewed for debugging

## 🔐 Security

- Files are validated for type and size before processing
- PDF/image processing uses trusted libraries (pdfplumber, OpenCV, pytesseract)
- Uploaded files are stored temporarily and deleted after processing
- No personal data is stored or logged
- All processing happens server-side

## 🎯 Future Enhancements

- Support for more file formats (Excel, CSV)
- Batch file uploads
- Template-based marksheet recognition (customizable patterns per college)
- ML-based confidence scoring
- Auto-correct for common OCR mistakes
- Save/export correction rules
